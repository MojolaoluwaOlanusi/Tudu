import React, { useState } from 'react';
import TemplatePicker from '../../../components/templates/TemplatePicker';
import MarketplacePicker from '../../../components/templates/MarketplacePicker';
import { useInstallTemplate } from '../../../hooks/useTemplates';
import { useBoardStore } from '../../../store/boardStore';
import { useUiStore } from '../../../store/uiStore';
import { PageHeader } from './primitives';
import type { Board } from '../../../types/board';

type Tab = 'builtin' | 'marketplace';

const SettingsTemplates: React.FC = () => {
  const [tab, setTab] = useState<Tab>('builtin');
  const install = useInstallTemplate();
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard);
  const pushToast = useUiStore((s) => s.pushToast);
  const [picking, setPicking] = useState<string | null>(null);

  const handleSelectBuiltin = (slug: string) => {
    setPicking(slug);
    install.mutate(
      { slug },
      {
        onSuccess: (board) => {
          setActiveBoard(board.id);
          pushToast(`Board "${board.name}" created from template`, 'success');
          setPicking(null);
        },
        onError: (err) => {
          const detail = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
          pushToast(detail || 'Could not create the board', 'error');
          setPicking(null);
        },
      },
    );
  };

  const handleInstalled = (board: Board) => {
    setActiveBoard(board.id);
    pushToast(`Board "${board.name}" created from template`, 'success');
  };

  return (
    <div>
      <PageHeader
        title="Templates"
        description="Start from a built-in template or install one from the community."
      />

      <div className="mb-4 inline-flex rounded-xl border border-line bg-surface p-1">
        {(['builtin', 'marketplace'] as Tab[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={
              'rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ' +
              (tab === key
                ? 'bg-raised text-ink'
                : 'text-ink-muted hover:text-ink')
            }
          >
            {key === 'builtin' ? 'Built-in' : 'Marketplace'}
          </button>
        ))}
      </div>

      {tab === 'builtin' ? (
        <TemplatePicker onSelect={handleSelectBuiltin} disabled={install.isPending} />
      ) : (
        <MarketplacePicker onInstalled={handleInstalled} disabled={false} />
      )}

      {picking && tab === 'builtin' && (
        <p className="mt-4 text-xs text-ink-muted" aria-live="polite">
          Setting up {picking}...
        </p>
      )}
    </div>
  );
};

export default SettingsTemplates;