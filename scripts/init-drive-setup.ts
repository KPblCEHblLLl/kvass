import fs from 'fs';
import path from 'path';

function loadEnv(): void {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        val = val.trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

const TARGET_FILES = ['khlebets.json', 'sooslo.json'];

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  trashed?: boolean;
}

async function main(): Promise<void> {
  console.log('--- GOOGLE DRIVE INITIAL FOLDER SETUP & VALIDATION ---');

  const missing: string[] = [];
  if (!clientId) missing.push('GOOGLE_CLIENT_ID');
  if (!clientSecret) missing.push('GOOGLE_CLIENT_SECRET');
  if (!refreshToken) missing.push('GOOGLE_REFRESH_TOKEN');
  if (!folderId) missing.push('GOOGLE_DRIVE_FOLDER_ID');

  if (missing.length > 0) {
    console.error(`\n[ERROR] Missing required environment variables in .env: ${missing.join(', ')}`);
    if (!refreshToken) {
      console.error('Run "node scripts/get-refresh-token.mjs" first to obtain GOOGLE_REFRESH_TOKEN.\n');
    }
    process.exit(1);
  }

  console.log(`\n1. Validating OAuth credentials & requesting access token...`);
  let accessToken: string;
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[ERROR] Failed to obtain access token from Google OAuth:');
      console.error(tokenData);
      process.exit(1);
    }
    accessToken = tokenData.access_token;
    console.log('   [OK] Access token obtained successfully.');
  } catch (err) {
    console.error('[ERROR] Network error requesting access token:', err);
    process.exit(1);
  }

  console.log(`\n2. Validating target folder (${folderId})...`);
  try {
    const folderRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?fields=id,name,mimeType,trashed`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const folderData = (await folderRes.json()) as DriveFile & { error?: unknown };
    if (!folderRes.ok || folderData.error) {
      console.error('[ERROR] Could not access Google Drive folder:');
      console.error(folderData);
      process.exit(1);
    }

    if (folderData.trashed) {
      console.error(`[ERROR] Target folder "${folderData.name}" (${folderId}) is in trash.`);
      process.exit(1);
    }

    console.log(`   [OK] Target folder found: "${folderData.name}" (MIME: ${folderData.mimeType})`);
  } catch (err) {
    console.error('[ERROR] Network error accessing folder:', err);
    process.exit(1);
  }

  console.log(`\n3. Checking existing files in folder...`);
  let existingFiles: DriveFile[] = [];
  try {
    const query = `'${folderId}' in parents and trashed = false`;
    const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent('files(id, name, mimeType)')}`;
    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const listData = (await listRes.json()) as { files?: DriveFile[]; error?: unknown };
    if (!listRes.ok || listData.error) {
      console.error('[ERROR] Failed to list files in folder:');
      console.error(listData);
      process.exit(1);
    }

    existingFiles = listData.files || [];
    console.log(`   Found ${existingFiles.length} file(s) in folder:`);
    for (const f of existingFiles) {
      console.log(`   - ${f.name} (ID: ${f.id}, Type: ${f.mimeType})`);
    }
  } catch (err) {
    console.error('[ERROR] Network error listing files:', err);
    process.exit(1);
  }

  console.log(`\n4. Validating / creating required JSON files (${TARGET_FILES.join(', ')})...`);
  for (const fileName of TARGET_FILES) {
    const baseName = fileName.replace(/\.json$/i, '');
    const existing =
      existingFiles.find(
        (f) =>
          (f.name === fileName || f.name === baseName) &&
          (f.mimeType === 'application/json' || f.mimeType === 'text/plain')
      ) || existingFiles.find((f) => f.name === fileName || f.name === baseName);

    if (existing) {
      console.log(`   [EXISTS] File "${existing.name}" already exists (ID: ${existing.id}, MIME: ${existing.mimeType})`);
    } else {
      console.log(`   [CREATING] File "${fileName}" not found. Creating JSON file...`);
      try {
        const metadata = {
          name: fileName,
          mimeType: 'application/json',
          parents: [folderId],
        };
        const initialContent = JSON.stringify([], null, 2);
        const boundary = '-------314159265358979323846';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;

        const multipartRequestBody =
          delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          'Content-Type: application/json\r\n\r\n' +
          initialContent +
          closeDelimiter;

        const createRes = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': `multipart/related; boundary=${boundary}`,
            },
            body: multipartRequestBody,
          }
        );

        const createdData = (await createRes.json()) as DriveFile & { error?: unknown };
        if (!createRes.ok || createdData.error) {
          console.error(`   [ERROR] Failed to create file "${fileName}":`, createdData);
        } else {
          console.log(`   [CREATED] File "${fileName}" created successfully! (ID: ${createdData.id})`);
        }
      } catch (err) {
        console.error(`   [ERROR] Network error creating file "${fileName}":`, err);
      }
    }
  }

  console.log('\n--- SETUP COMPLETE ---');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
