import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

loadEnv();

let cachedAccessToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Google OAuth credentials in environment.');
  }

  const now = Date.now();
  if (cachedAccessToken && now < tokenExpiresAt - 60000) {
    return cachedAccessToken;
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Failed to refresh token: ${data.error_description || data.error}`);
  }

  cachedAccessToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in || 3600) * 1000;
  return cachedAccessToken;
}

const LOCAL_FALLBACK_FILE = path.resolve(process.cwd(), 'data', 'khlebets.json');

function getLocalKhlebets() {
  if (fs.existsSync(LOCAL_FALLBACK_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(LOCAL_FALLBACK_FILE, 'utf8'));
    } catch {
      return [];
    }
  }
  return [];
}

function saveLocalKhlebets(items) {
  const dir = path.dirname(LOCAL_FALLBACK_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(LOCAL_FALLBACK_FILE, JSON.stringify(items, null, 2), 'utf8');
}

export async function fetchKhlebetsList() {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId || !process.env.GOOGLE_REFRESH_TOKEN) {
    return getLocalKhlebets();
  }

  try {
    const token = await getAccessToken();
    const query = `'${folderId}' in parents and (name = 'khlebets.json' or name = 'khlebets') and trashed = false`;
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType)`;

    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const searchData = await searchRes.json();

    if (!searchRes.ok || searchData.error) {
      console.warn('[DriveService] Search failed, using local storage:', searchData.error);
      return getLocalKhlebets();
    }

    const file = searchData.files && searchData.files[0];
    if (!file) {
      await saveKhlebetsList([]);
      return [];
    }

    const getUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
    const getRes = await fetch(getUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!getRes.ok) {
      console.warn('[DriveService] Failed to read remote file, using local fallback.');
      return getLocalKhlebets();
    }

    const text = await getRes.text();
    if (!text.trim()) return [];
    return JSON.parse(text);
  } catch (err) {
    console.warn('[DriveService] Error fetching from Drive:', err.message);
    return getLocalKhlebets();
  }
}

export async function saveKhlebetsList(items) {
  saveLocalKhlebets(items);

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId || !process.env.GOOGLE_REFRESH_TOKEN) {
    return items;
  }

  try {
    const token = await getAccessToken();
    const query = `'${folderId}' in parents and (name = 'khlebets.json' or name = 'khlebets') and trashed = false`;
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType)`;

    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const searchData = await searchRes.json();
    const file = searchData.files && searchData.files[0];

    const content = JSON.stringify(items, null, 2);

    if (file) {
      const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${file.id}?uploadType=media`;
      await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: content,
      });
    } else {
      const metadata = {
        name: 'khlebets.json',
        mimeType: 'application/json',
        parents: [folderId],
      };
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const multipartBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        content +
        closeDelimiter;

      await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      });
    }
  } catch (err) {
    console.warn('[DriveService] Error saving to Google Drive:', err.message);
  }

  return items;
}
