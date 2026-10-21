import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBoards, useBoardColumns } from '../hooks/useBoards';
import {
  integrationService,
  type GitHubRepo,
  type GitHubStatus,
  type GitHubMapping,
} from '../services/integrationService';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';

const IntegrationsSettings: React.FC = () => {
  const { token } = useAuthStore();
  const pushToast = useUiStore((s) => s.pushToast);
  const [params, setParams] = useSearchParams();
  const { data: boards = [] } = useBoards();
  const [boardId, setBoardId] = useState<string>('');
  const { data: columns = [] } = useBoardColumns(boardId || null);

  const [status, setStatus] = useState<GitHubStatus | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [mappings, setMappings] = useState<GitHubMapping[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedRepo, setSelectedRepo] = useState('');
  const [openedCol, setOpenedCol] = useState('');
  const [mergedCol, setMergedCol] = useState('');

  const refresh = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const s = await integrationService.getStatus(token);
      setStatus(s);
      if (s.connected) {
        const [r, m] = await Promise.all([
          integrationService.getRepos(token),
          integrationService.listMappings(token),
        ]);
        setRepos(r);
        setMappings(m);
      }
    } catch (err) {
      pushToast('Could not load GitHub status', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.get('connected') === '1') {
      pushToast('GitHub connected', 'success');
    }
    if (params.get('error')) {
      pushToast('GitHub connection failed: ' + params.get('error'), 'error');
    }
    if (params.get('connected') || params.get('error')) {
      const next = new URLSearchParams(params);
      next.delete('connected');
      next.delete('error');
      setParams(next, { replace: true });
    }
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = async () => {
    if (!token) return;
    try {
      const { url } = await integrationService.startOAuth(token);
      window.location.href = url;
    } catch {
      pushToast('Could not start GitHub authorization', 'error');
    }
  };

  const handleDisconnect = async () => {
    if (!token) return;
    if (!window.confirm('Disconnect GitHub? Repos and mappings stay, but the token is deleted.')) return;
    try {
      await integrationService.disconnect(token);
      setStatus({ connected: false });
      setRepos([]);
      setMappings([]);
      pushToast('GitHub disconnected', 'success');
    } catch {
      pushToast('Could not disconnect GitHub', 'error');
    }
  };

  const handleSaveMapping = async () => {
    if (!token) return;
    if (!boardId || !selectedRepo || !openedCol || !mergedCol) {
      pushToast('Fill in every field', 'error');
      return;
    }
    try {
      await integrationService.saveMapping(token, {
        board_id: boardId,
        repo_full_name: selectedRepo,
        pr_opened_column_id: openedCol,
        pr_merged_column_id: mergedCol,
      });
      pushToast('Mapping saved', 'success');
      setSelectedRepo('');
      setOpenedCol('');
      setMergedCol('');
      await refresh();
    } catch (err) {
      const detail = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      pushToast(detail || 'Could not save mapping', 'error');
    }
  };

  const handleDeleteMapping = async (m: GitHubMapping) => {
    if (!token) return;
    if (!window.confirm('Remove mapping for ' + m.repo_full_name + '?')) return;
    try {
      await integrationService.deleteMapping(token, m.id);
      await refresh();
      pushToast('Mapping removed', 'success');
    } catch {
      pushToast('Could not remove mapping', 'error');
    }
  };

  if (loading) {
    return <p className="text-sm text-ink-muted">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 font-handwritten text-3xl text-ink">Integrations</h1>
      <p className="mb-6 text-sm text-ink-muted">
        Link GitHub to a board. When a PR contains a task ID (e.g., TUDU-12),
        the task moves automatically.
      </p>

      <section className="card mb-5 p-5">
        <h2 className="mb-3 font-handwritten text-xl text-ink">GitHub</h2>
        {!status?.connected ? (
          <>
            <p className="mb-3 text-sm text-ink-muted">
              Connect your GitHub account once. After that, pick any number
              of repositories and map each one to a board.
            </p>
            <button type="button" onClick={handleConnect} className="btn-accent brush-stroke">
              Connect GitHub
            </button>
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink">
              Connected as <span className="font-semibold">@{status.login}</span>
            </p>
            <button
              type="button"
              onClick={handleDisconnect}
              className="rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-red-500 hover:border-red-300"
            >
              Disconnect
            </button>
          </div>
        )}
      </section>

      {status?.connected && (
        <>
          <section className="card mb-5 p-5">
            <h2 className="mb-3 font-handwritten text-xl text-ink">Add a mapping</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">Repository</label>
                <select
                  value={selectedRepo}
                  onChange={(e) => setSelectedRepo(e.target.value)}
                  className="input w-full"
                >
                  <option value="">Select a repo…</option>
                  {repos.map((r) => (
                    <option key={r.id} value={r.full_name}>
                      {r.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">Board</label>
                <select
                  value={boardId}
                  onChange={(e) => {
                    setBoardId(e.target.value);
                    setOpenedCol('');
                    setMergedCol('');
                  }}
                  className="input w-full"
                >
                  <option value="">Select a board…</option>
                  {boards.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              {boardId && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-muted">
                      When PR opens →
                    </label>
                    <select
                      value={openedCol}
                      onChange={(e) => setOpenedCol(e.target.value)}
                      className="input w-full"
                    >
                      <option value="">Select a column…</option>
                      {columns.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-muted">
                      When PR merges →
                    </label>
                    <select
                      value={mergedCol}
                      onChange={(e) => setMergedCol(e.target.value)}
                      className="input w-full"
                    >
                      <option value="">Select a column…</option>
                      {columns.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={handleSaveMapping}
                disabled={!boardId || !selectedRepo || !openedCol || !mergedCol}
                className="btn-accent w-full disabled:opacity-60"
              >
                Save mapping
              </button>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-handwritten text-xl text-ink">Your mappings</h2>
            {mappings.length === 0 ? (
              <p className="text-sm text-ink-muted">No mappings yet.</p>
            ) : (
              <ul className="space-y-2">
                {mappings.map((m) => (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-hairline bg-surface-2 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{m.repo_full_name}</p>
                      <p className="truncate text-[11px] text-ink-muted">
                        Board: {m.board_name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteMapping(m)}
                      className="rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:border-red-300"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default IntegrationsSettings;
