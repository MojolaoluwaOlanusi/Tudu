import React, { useState } from 'react';
import { useBoards, useBoardColumns } from '../hooks/useBoards';
import { useActiveBoardId } from '../hooks/useBoards';
import { integrationService, type GitHubRepo } from '../services/integrationService';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';

const IntegrationsSettings: React.FC = () => {
  const { token } = useAuthStore();
  const pushToast = useUiStore((s) => s.pushToast);
  const { data: boards = [] } = useBoards();
  const [boardId, setBoardId] = useState<string>('');
  const { data: columns = [] } = useBoardColumns(boardId || null);

  const [githubToken, setGithubToken] = useState('');
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState('');

  const [openedCol, setOpenedCol] = useState('');
  const [mergedCol, setMergedCol] = useState('');

  const handleConnect = async () => {
    try {
      await integrationService.connectGitHub(token!, githubToken);
      pushToast('GitHub connected', 'success');
      const r = await integrationService.getRepos(token!);
      setRepos(r);
    } catch (err) {
      pushToast('Could not connect to GitHub. Check your token.', 'error');
    }
  };

  const handleSaveMapping = async () => {
    if (!boardId || !selectedRepo || !openedCol || !mergedCol) {
      pushToast('Please fill all fields', 'error');
      return;
    }
    try {
      await integrationService.saveMapping(token!, {
        board_id: boardId,
        repo_full_name: selectedRepo,
        pr_opened_column_id: openedCol,
        pr_merged_column_id: mergedCol,
      });
      pushToast('Mapping saved', 'success');
    } catch (err) {
      pushToast('Could not save mapping', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 font-handwritten text-3xl text-ink">Integrations</h1>
      <p className="mb-6 text-sm text-ink-muted">
        Link GitHub to a board. When a PR contains a task ID (e.g., TUDU-12),
        the task moves automatically.
      </p>

      <section className="card mb-5 p-5">
        <h2 className="mb-3 font-handwritten text-xl text-ink">1. Connect GitHub</h2>
        <div className="flex gap-2">
          <input
            type="password"
            value={githubToken}
            onChange={(e) => setGithubToken(e.target.value)}
            placeholder="ghp_..."
            className="input flex-1"
          />
          <button onClick={handleConnect} className="btn-accent shrink-0">
            Connect
          </button>
        </div>
        <p className="mt-2 text-[11px] text-ink-muted">
          Create a Personal Access Token (classic) with `repo` scope.
        </p>
      </section>

      {repos.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-3 font-handwritten text-xl text-ink">2. Map a Repository</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">Repository</label>
              <select value={selectedRepo} onChange={(e) => setSelectedRepo(e.target.value)} className="input w-full">
                <option value="">Select a repo...</option>
                {repos.map((r) => <option key={r.id} value={r.full_name}>{r.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">Tudu Board</label>
              <select value={boardId} onChange={(e) => setBoardId(e.target.value)} className="input w-full">
                <option value="">Select a board...</option>
                {boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            {boardId && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">When PR opens →</label>
                  <select value={openedCol} onChange={(e) => setOpenedCol(e.target.value)} className="input w-full">
                    <option value="">Select column...</option>
                    {columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">When PR merges →</label>
                  <select value={mergedCol} onChange={(e) => setMergedCol(e.target.value)} className="input w-full">
                    <option value="">Select column...</option>
                    {columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            )}
            <button onClick={handleSaveMapping} className="btn-accent mt-2 w-full">Save Mapping</button>
          </div>
        </section>
      )}
    </div>
  );
};

export default IntegrationsSettings;
