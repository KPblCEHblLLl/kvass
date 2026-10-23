import http from 'http';
import url from 'url';
import fs from 'fs';
import path from 'path';

function loadEnv() {
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
const port = 3000;
const redirectUri = `http://localhost:${port}/oauth2callback`;
const scope = 'https://www.googleapis.com/auth/drive';

if (!clientId || !clientSecret) {
  console.error('\n[ERROR] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env\n');
  console.error('Add them to .env before running this script:');
  console.error('GOOGLE_CLIENT_ID=your_client_id');
  console.error('GOOGLE_CLIENT_SECRET=your_client_secret\n');
  process.exit(1);
}

const authUrl =
  `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${encodeURIComponent(clientId)}&` +
  `redirect_uri=${encodeURIComponent(redirectUri)}&` +
  `response_type=code&` +
  `scope=${encodeURIComponent(scope)}&` +
  `access_type=offline&` +
  `prompt=consent`;

console.log('\n--- GOOGLE OAUTH AUTHORIZATION ---');
console.log('1. Open this URL in browser:\n');
console.log(authUrl);
console.log('\n2. Sign in and grant access.');
console.log(`3. Waiting for redirect on ${redirectUri} ...\n`);

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url || '', true);
  if (parsed.pathname === '/oauth2callback') {
    const code = parsed.query.code;
    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing auth code.');
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Auth successful! You can close this tab and return to terminal.');
    server.close();

    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenRes.json();

      if (tokenData.refresh_token) {
        console.log('\n=============================================');
        console.log('SUCCESS! Refresh token obtained:');
        console.log('=============================================');
        console.log(tokenData.refresh_token);
        console.log('=============================================\n');

        // Automatically update .env if possible
        const envPath = path.resolve(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
          let envContent = fs.readFileSync(envPath, 'utf8');
          if (/^GOOGLE_REFRESH_TOKEN=/m.test(envContent)) {
            envContent = envContent.replace(/^GOOGLE_REFRESH_TOKEN=.*$/m, `GOOGLE_REFRESH_TOKEN=${tokenData.refresh_token}`);
          } else {
            envContent += `\nGOOGLE_REFRESH_TOKEN=${tokenData.refresh_token}\n`;
          }
          fs.writeFileSync(envPath, envContent, 'utf8');
          console.log('Automatically updated GOOGLE_REFRESH_TOKEN in .env\n');
        } else {
          console.log('Add this token to .env:');
          console.log(`GOOGLE_REFRESH_TOKEN=${tokenData.refresh_token}\n`);
        }
      } else {
        console.error('\n[ERROR] Failed to obtain refresh token:');
        console.error(tokenData);
      }
    } catch (err) {
      console.error('\n[ERROR] Request failed:', err);
    }
  }
});

server.listen(port);
