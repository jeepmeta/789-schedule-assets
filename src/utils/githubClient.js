// src/utils/githubClient.js
// Frontend helper to start OAuth and call backend to save config
export function buildGitHubOAuthUrl(clientId, redirectUri, state) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'repo',
    state
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}
