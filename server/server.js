// server/server.js
// Simple Express backend to exchange OAuth code and commit JSON to GitHub
// Run with: node server.js
// Requires environment variables in .env: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, REPO_OWNER, REPO_NAME, TARGET_PATH

const express = require('express');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
const base64 = require('base-64');
require('dotenv').config();

const {
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  REPO_OWNER,
  REPO_NAME,
  TARGET_PATH // e.g., src/config.json or configs/789-studio-overrides.json
} = process.env;

if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET || !REPO_OWNER || !REPO_NAME || !TARGET_PATH) {
  console.error('Missing required env vars. See README in server folder.');
  process.exit(1);
}

const app = express();
app.use(bodyParser.json({ limit: '2mb' }));

// Exchange OAuth code for access token
async function exchangeCodeForToken(code) {
  const url = 'https://github.com/login/oauth/access_token';
  const res = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error_description || data.error);
  return data.access_token;
}

// Get file SHA if exists
async function getFileSha(token, path, branch = 'main') {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${encodeURIComponent(path)}?ref=${branch}`;
  const res = await fetch(url, {
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to get file SHA: ${res.status} ${txt}`);
  }
  const json = await res.json();
  return json.sha;
}

// Create or update file
async function createOrUpdateFile(token, path, contentBase64, message, sha = null, branch = 'main') {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${encodeURIComponent(path)}`;
  const body = {
    message,
    content: contentBase64,
    branch
  };
  if (sha) body.sha = sha;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(json));
  return json;
}

// Endpoint to accept commit request from frontend
app.post('/api/save-config', async (req, res) => {
  try {
    const { code, filename, content, commitMessage } = req.body;
    if (!code || !content) return res.status(400).json({ error: 'Missing code or content' });

    // 1. Exchange code for token
    const token = await exchangeCodeForToken(code);

    // 2. Determine target path
    const path = filename || TARGET_PATH;

    // 3. Get existing file SHA if present
    const sha = await getFileSha(token, path);

    // 4. Create commit
    const contentBase64 = base64.encode(content);
    const message = commitMessage || `Update ${path} via Studio`;
    const result = await createOrUpdateFile(token, path, contentBase64, message, sha);

    return res.json({ ok: true, result });
  } catch (err) {
    console.error('save-config error', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
});

// Health
app.get('/api/ping', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`GitHub commit server listening on port ${PORT}`);
});
