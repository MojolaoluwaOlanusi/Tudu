import { Octokit } from '@octokit/rest';

/**
 * Simple wrapper around Octokit to list repos.
 * We use the Personal Access Token (PAT) the user pastes in.
 */
export const listRepositories = async (token: string) => {
  const octokit = new Octokit({ auth: token });
  const { data } = await octokit.repos.listForAuthenticatedUser({
    sort: 'updated',
    per_page: 100,
  });
  return data.map((repo) => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    private: repo.private,
  }));
};


const GITHUB_OAUTH_TOKEN_URL = 'https://github.com/login/oauth/access_token';

export interface GitHubAccessTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

/**
 * Exchange an OAuth authorization code for an access token.
 *
 * Plain REST call to GitHub's token endpoint - no SDK needed. GitHub
 * returns JSON when Accept: application/json is set; otherwise it returns
 * a form-encoded body.
 */
export const exchangeCodeForToken = async (
  code: string
): Promise<GitHubAccessTokenResponse> => {
  const res = await fetch(GITHUB_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  const data = (await res.json()) as GitHubAccessTokenResponse & {
    error?: string;
    error_description?: string;
  };
  if (!res.ok || data.error) {
    throw new Error(data.error_description || 'GitHub token exchange failed');
  }
  return data;
};

/** The login of the account that owns this token. */
export const getAuthenticatedUser = async (
  token: string
): Promise<{ login: string; id: number }> => {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
    },
  });
  if (!res.ok) throw new Error('Could not verify GitHub token');
  const data = (await res.json()) as { login: string; id: number };
  return { login: data.login, id: data.id };
};
