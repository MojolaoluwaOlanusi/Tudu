import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBoards, useBoardColumns } from '../../../hooks/useBoards';
import {
  integrationService,
  type GitHubRepo,
  type GitHubStatus,
  type GitHubMapping,
  type SlackStatus,
  type SlackChannel,
} from '../../../services/integrationService';
import { useAuthStore } from '../../../store/authStore';
import { useUiStore } from '../../../store/uiStore';

const IntegrationsSettings: React.FC = () => {
  const { token } = useAuthStore();
  const pushToast = useUiStore((s) => s.pushToast);
  const [params, setParams] = useSearchParams();
  const { data: boards = [] } = useBoards();

  /* ------------------------------ shared ------------------------------ */

  const [boardId, setBoardId] = useState<string>('');
  const { data: columns = [] } = useBoardColumns(boardId || null);

  /* ------------------------------ GitHub ------------------------------ */

  const [ghStatus, setGhStatus] = useState<GitHubStatus | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [mappings, setMappings] = useState<GitHubMapping[]>([]);
  const [ghLoading, setGhLoading] = useState(true);
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);

  const [selectedRepo, setSelectedRepo] = useState('');
  const [openedCol, setOpenedCol] = useState('');
  const [mergedCol, setMergedCol] = useState('');

  /* ------------------------------- Slack ------------------------------ */

  const [slackStatus, setSlackStatus] = useState<SlackStatus | null>(null);
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [slackLoading, setSlackLoading] = useState(true);
  const [slackBusy, setSlackBusy] = useState(false);

  const refreshGitHub = useCallback(async () => {
    if (!token) return;
    setGhLoading(true);
    try {
      const s = await integrationService.getStatus(token);
      setGhStatus(s);
      if (s.connected) {
        const [r, m, sec] = await Promise.all([
          integrationService.getRepos(token),
          integrationService.listMappings(token),
          integrationService.getWebhookSecret(token).catch(() => null)
        ]);
        setRepos(r);
        setMappings(m);
        if (sec && sec.secret) setWebhookSecret(sec.secret);
      }
    } catch {
      pushToast('Could not load GitHub status', 'error');
    } finally {
      setGhLoading(false);
    }
  }, [token, pushToast]);

  const refreshSlack = useCallback(async () => {
    if (!token) return;
    setSlackLoading(true);
    try {
      const s = await integrationService.getSlackStatus(token);
      setSlackStatus(s);
      if (s.connected) {
        const c = await integrationService.getSlackChannels(token).catch(() => []);
        setChannels(c);
      } else {
        setChannels([]);
      }
    } catch {
      pushToast('Could not load Slack status', 'error');
    } finally {
      setSlackLoading(false);
    }
  }, [token, pushToast]);

  useEffect(() => {
    if (params.get('connected') === '1') pushToast('GitHub connected', 'success');
    if (params.get('slack') === 'connected') pushToast('Slack connected', 'success');
    if (params.get('slack') === 'error') {
      pushToast('Slack connection failed: ' + (params.get('reason') || 'unknown'), 'error');
    }
    if (params.get('connected') || params.get('error') || params.get('slack')) {
      const next = new URLSearchParams(params);
      ['connected', 'error', 'slack', 'reason'].forEach((k) => next.delete(k));
      setParams(next, { replace: true });
    }
    void refreshGitHub();
    void refreshSlack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------------- GitHub actions --------------------------- */

  const handleConnectGitHub = async () => {
    if (!token) return;
    try {
      const { url } = await integrationService.startOAuth(token);
      window.location.href = url;
    } catch {
      pushToast('Could not start GitHub authorization', 'error');
    }
  };

  const handleDisconnectGitHub = async () => {
    if (!token) return;
    if (!window.confirm('Disconnect GitHub? Repos and mappings stay, but the token is deleted.')) return;
    try {
      await integrationService.disconnect(token);
      setGhStatus({ connected: false });
      setRepos([]);
      setMappings([]);
      setWebhookSecret(null);
      pushToast('GitHub disconnected', 'success');
    } catch {
      pushToast('Could not disconnect GitHub', 'error');
    }
  };

  const handleRotateSecret = async () => {
    if (!token) return;
    if (!window.confirm('Rotate the webhook secret? You will need to update the GitHub repo settings immediately.')) return;
    setRotating(true);
    try {
      const sec = await integrationService.rotateSecret(token);
      setWebhookSecret(sec.secret);
      pushToast('Webhook secret rotated', 'success');
    } catch {
      pushToast('Could not rotate the secret', 'error');
    } finally {
      setRotating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      pushToast('Copied to clipboard', 'success');
    } catch {
      pushToast('Could not copy', 'error');
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
      await refreshGitHub();
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
      await refreshGitHub();
      pushToast('Mapping removed', 'success');
    } catch {
      pushToast('Could not remove mapping', 'error');
    }
  };

  /* ---------------------------- Slack actions ---------------------------- */

  const handleConnectSlack = async () => {
    if (!token) return;
    try {
      const { url } = await integrationService.startSlackOAuth(token);
      window.location.href = url;
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      pushToast(
        status === 402 ? 'Slack integration requires Pro' : 'Could not start Slack authorization',
        'error'
      );
    }
  };

  const handleDisconnectSlack = async () => {
    if (!token) return;
    if (!window.confirm('Disconnect Slack? Notifications will stop immediately.')) return;
    try {
      await integrationService.disconnectSlack(token);
      setSlackStatus({ connected: false });
      setChannels([]);
      pushToast('Slack disconnected', 'success');
    } catch {
      pushToast('Could not disconnect Slack', 'error');
    }
  };

  const patchSlack = async (patch: Parameters<typeof integrationService.saveSlackSettings>[1]) => {
    if (!token) return;
    setSlackBusy(true);
    try {
      await integrationService.saveSlackSettings(token, patch);
      await refreshSlack();
    } catch {
      pushToast('Could not save the Slack setting', 'error');
    } finally {
      setSlackBusy(false);
    }
  };

  const handleTestSlack = async () => {
    if (!token) return;
    setSlackBusy(true);
    try {
      await integrationService.sendSlackTest(token);
      pushToast('Test message sent', 'success');
    } catch (err) {
      const detail = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      pushToast(detail || 'Could not send the test message', 'error');
    } finally {
      setSlackBusy(false);
    }
  };

  /* ------------------------------- render ------------------------------- */

  return (
    <div className="">
      <h1 className="mb-2 font-handwritten text-3xl text-ink">Integrations</h1>
      <p className="mb-6 text-sm text-ink-muted">
        Link GitHub and Slack to your boards. A task ID in a PR title moves the
        card; assignments and due dates show up in Slack.
      </p>

      {/* ------------------------------ Slack ------------------------------ */}
      <section className="card mb-5 p-5">
        <h2 className="mb-3 font-handwritten text-xl text-ink">Slack</h2>

        {slackLoading ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : !slackStatus?.connected ? (
          <>
            <p className="mb-3 text-sm text-ink-muted">
              Connect a Slack workspace once. After that you can run{' '}
              <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px]">
                /tudu create Buy milk tomorrow
              </code>{' '}
              and receive assignment and due-date notifications.
            </p>
            <button type="button" onClick={handleConnectSlack} className="btn-accent brush-stroke">
              Connect Slack
            </button>
          </>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink">
                Connected to <span className="font-semibold">{slackStatus.teamName}</span>
              </p>
              <button
                type="button"
                onClick={handleDisconnectSlack}
                className="rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-red-400 hover:border-red-400/60"
              >
                Disconnect
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">
                  Notification channel
                </label>
                <select
                  value={slackStatus.channelId ?? ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    const channel = channels.find((c) => c.id === id);
                    void patchSlack({ channelId: id || null, channelName: channel?.name ?? null });
                  }}
                  disabled={slackBusy}
                  className="input w-full"
                >
                  <option value="">No channel (notifications off)</option>
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.name}
                      {c.is_private ? ' (private)' : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-ink-muted">
                  Private channels need the Tudu bot invited before it can post.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">
                  Default board for <code className="font-mono text-[11px]">/tudu create</code>
                </label>
                <select
                  value={slackStatus.defaultBoardId ?? ''}
                  onChange={(e) => void patchSlack({ defaultBoardId: e.target.value || null })}
                  disabled={slackBusy}
                  className="input w-full"
                >
                  <option value="">My first personal board</option>
                  {boards.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={slackStatus.notifyAssignments ?? true}
                    onChange={(e) => void patchSlack({ notifyAssignments: e.target.checked })}
                    disabled={slackBusy}
                    className="h-4 w-4 accent-accent"
                  />
                  When a task is assigned to me
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={slackStatus.notifyDue ?? true}
                    onChange={(e) => void patchSlack({ notifyDue: e.target.checked })}
                    disabled={slackBusy}
                    className="h-4 w-4 accent-accent"
                  />
                  Daily due-date digest
                </label>
              </div>

              <button
                type="button"
                onClick={handleTestSlack}
                disabled={slackBusy || !slackStatus.channelId}
                className="btn-ghost rounded-lg px-3 py-2 text-sm disabled:opacity-50"
              >
                Send a test message
              </button>
            </div>
          </>
        )}
      </section>

      {/* ------------------------------ GitHub ------------------------------ */}
      <section className="card mb-5 p-5">
        <h2 className="mb-3 font-handwritten text-xl text-ink">GitHub</h2>

        {ghLoading ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : !ghStatus?.connected ? (
          <>
            <p className="mb-3 text-sm text-ink-muted">
              Connect your GitHub account once. After that, pick any number of
              repositories and map each one to a board.
            </p>
            <button type="button" onClick={handleConnectGitHub} className="btn-accent brush-stroke">
              Connect GitHub
            </button>
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink">
              Connected as <span className="font-semibold">@{ghStatus.login}</span>
            </p>
            <button
              type="button"
              onClick={handleDisconnectGitHub}
              className="rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-red-400 hover:border-red-400/60"
            >
              Disconnect
            </button>
          </div>
        )}
      </section>

      {ghStatus?.connected && (
        <>
          {/* ------------------------- Webhook Secret ------------------------- */}
          <section className="card mb-5 p-5">
            <h2 className="mb-3 font-handwritten text-xl text-ink">GitHub webhook</h2>
            <p className="mb-3 text-sm text-ink-muted">
              Use this endpoint and secret when configuring the webhook in your GitHub repository settings.
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">Payload URL</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api/integrations/github/webhook' : window.location.origin.replace('5173', '5000') + '/api/integrations/github/webhook'}
                    className="input flex-1 bg-surface-2 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api/integrations/github/webhook' : window.location.origin.replace('5173', '5000') + '/api/integrations/github/webhook')}
                    className="btn-ghost shrink-0 !py-1.5 !text-xs"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">Secret</label>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    readOnly
                    value={webhookSecret || 'Loading...'}
                    className="input flex-1 bg-surface-2 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => webhookSecret && copyToClipboard(webhookSecret)}
                    disabled={!webhookSecret}
                    className="btn-ghost shrink-0 !py-1.5 !text-xs disabled:opacity-50"
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={handleRotateSecret}
                    disabled={rotating}
                    className="rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:border-red-300 disabled:opacity-50"
                  >
                    {rotating ? 'Rotating...' : 'Rotate'}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-hairline bg-surface-2 p-3 text-xs text-ink-muted">
                <p className="mb-2 font-semibold text-ink">How to set it up:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Go to your GitHub repo → Settings → Webhooks</li>
                  <li>Click <strong>Add webhook</strong></li>
                  <li>Paste the <strong>Payload URL</strong> above</li>
                  <li>Set Content type to <code>application/json</code></li>
                  <li>Paste the <strong>Secret</strong> above</li>
                  <li>Under events, select <strong>Pull requests</strong> only</li>
                </ol>
              </div>
            </div>
          </section>

          {/* --------------------------- Mappings ----------------------------- */}
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
                      <p className="truncate text-[11px] text-ink-muted">Board: {m.board_name}</p>
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

