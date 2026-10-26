import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useCommandPaletteStore } from '../../store/commandPaletteStore';
import { useShortcutHelpStore } from '../../store/shortcutHelpStore';
import { useUiStore } from '../../store/uiStore';
import { useBoardStore } from '../../store/boardStore';
import { useThemeStore } from '../../store/themeStore';
import { useBoards } from '../../hooks/useBoards';
import { useTasks } from '../../hooks/useTasks';

type Group = 'Actions' | 'Navigation' | 'Boards' | 'Tasks';

interface Item {
  id: string;
  label: string;
  hint?: string;
  group: Group;
  run: () => void;
}

const GROUP_ORDER: Group[] = ['Actions', 'Navigation', 'Boards', 'Tasks'];

const CommandPaletteInner = () => {
  const close = useCommandPaletteStore((s) => s.close);
  const openShortcutHelp = useShortcutHelpStore((s) => s.open);
  const openTaskForm = useUiStore((s) => s.openTaskForm);
  const openDetail = useUiStore((s) => s.openDetail);
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const { data: boards } = useBoards();
  const { data: tasks } = useTasks({});
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setQuery('');
    setActive(0);
    window.setTimeout(() => inputRef.current?.focus(), 10);
  }, []);

  const items: Item[] = useMemo(() => {
    const actions: Item[] = [
      { id: 'new-task', label: 'New task', hint: 'N', group: 'Actions', run: () => { close(); openTaskForm(null); } },
      { id: 'toggle-theme', label: 'Toggle theme', hint: 'T', group: 'Actions', run: () => { close(); toggleTheme(); } },
      { id: 'help', label: 'Keyboard shortcuts', hint: '?', group: 'Actions', run: () => { close(); openShortcutHelp(); } },
    ];
    const navigation: Item[] = [
      { id: 'go-list', label: 'Go to List', hint: 'G L', group: 'Navigation', run: () => { close(); navigate('/'); } },
      { id: 'go-board', label: 'Go to Board', hint: 'G B', group: 'Navigation', run: () => { close(); navigate('/board'); } },
      { id: 'go-stats', label: 'Go to Stats', hint: 'G S', group: 'Navigation', run: () => { close(); navigate('/stats'); } },
      { id: 'go-analytics', label: 'Go to Analytics', hint: 'G A', group: 'Navigation', run: () => { close(); navigate('/analytics'); } },
      { id: 'go-settings', label: 'Go to Settings', hint: 'G ,', group: 'Navigation', run: () => { close(); navigate('/settings/account'); } },
      { id: 'go-templates', label: 'Go to Templates', hint: 'G T', group: 'Navigation', run: () => { close(); navigate('/settings/templates'); } },
      { id: 'go-integrations', label: 'Go to Integrations', hint: 'G I', group: 'Navigation', run: () => { close(); navigate('/settings/integrations'); } },
      { id: 'go-billing', label: 'Go to Billing', hint: '', group: 'Navigation', run: () => { close(); navigate('/settings/billing'); } },
      { id: 'go-pricing', label: 'Go to Pricing', hint: 'G P', group: 'Navigation', run: () => { close(); navigate('/pricing'); } },
    ];
    const boardItems: Item[] = (boards ?? []).map((b) => ({
      id: 'board-' + b.id,
      label: b.name,
      hint: b.workspace_name ?? 'Board',
      group: 'Boards',
      run: () => { close(); setActiveBoard(b.id); navigate('/board'); },
    }));
    const taskItems: Item[] = (tasks ?? []).slice(0, 40).map((t) => ({
      id: 'task-' + t.id,
      label: t.title,
      hint: t.status,
      group: 'Tasks',
      run: () => { close(); openDetail({ type: 'task', id: t.id }); },
    }));
    return [...actions, ...navigation, ...boardItems, ...taskItems];
  }, [boards, tasks, close, openTaskForm, openShortcutHelp, navigate, setActiveBoard, toggleTheme, openDetail]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items.slice(0, 12);
    const q = query.toLowerCase();
    return items
      .filter((i) => i.label.toLowerCase().includes(q) || (i.hint ?? '').toLowerCase().includes(q))
      .slice(0, 12);
  }, [items, query]);

  useEffect(() => {
    if (active >= filtered.length) setActive(0);
  }, [filtered.length, active]);

  useEffect(() => {
    const el = listRef.current?.querySelectorAll('li')[active];
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [active]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((i) => Math.min(i + 1, filtered.length - 1)); return; }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActive((i) => Math.max(i - 1, 0)); return; }
    if (event.key === 'Enter') { event.preventDefault(); filtered[active]?.run(); return; }
    if (event.key === 'Escape') { event.preventDefault(); close(); }
  };

  const grouped = filtered.reduce<Record<Group, Item[]>>(
    (acc, item) => {
      (acc[item.group] = acc[item.group] || []).push(item);
      return acc;
    },
    { Actions: [], Navigation: [], Boards: [], Tasks: [] },
  );

  let flatIdx = -1;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center bg-black/50 p-4 pt-[15vh]"
      onClick={close}
      role="presentation"
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-line bg-surface shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-2 border-b border-line-subtle px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-ink-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search or jump to..."
            aria-label="Command palette search"
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
          />
          <kbd className="shrink-0 rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-[10px] text-ink-faint">Esc</kbd>
        </div>

        {filtered.length === 0 ? (
          <p className="px-4 py-6 text-center text-[12px] text-ink-faint">No matches.</p>
        ) : (
          <ul ref={listRef} className="max-h-[50vh] overflow-y-auto py-1">
            {GROUP_ORDER.filter((g) => grouped[g].length > 0).map((g) => (
              <li key={g}>
                <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">{g}</p>
                <ul>
                  {grouped[g].map((item) => {
                    flatIdx += 1;
                    const idx = flatIdx;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onMouseEnter={() => setActive(idx)}
                          onClick={item.run}
                          className={
                            'flex w-full items-center gap-3 px-4 py-2 text-left text-[13px] transition-colors ' +
                            (idx === active ? 'bg-brand-subtle text-ink' : 'text-ink-muted hover:bg-subtle')
                          }
                        >
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-line-strong" />
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          {item.hint && (
                            <kbd className="shrink-0 rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-[10px] text-ink-faint">{item.hint}</kbd>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const CommandPalette = () => {
  const isOpen = useCommandPaletteStore((s) => s.isOpen);
  return isOpen ? <CommandPaletteInner /> : null;
};

export default CommandPalette;