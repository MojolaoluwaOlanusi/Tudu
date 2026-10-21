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
