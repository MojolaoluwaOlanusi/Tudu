import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCommandPaletteStore } from '../../store/commandPaletteStore';
import { useShortcutHelpStore } from '../../store/shortcutHelpStore';
import { useUiStore } from '../../store/uiStore';
import { useBoardStore } from '../../store/boardStore';
import { useBoards } from '../../hooks/useBoards';
import { useTasks } from '../../hooks/useTasks';

type Group = 'Actions' | 'Boards' | 'Tasks';

interface Item {
  id: string;
  label: string;
  hint?: string;
  group: Group;
  run: () => void;
}

/**
 * Everything the palette can do. Split from the component so the hooks that
 * build the list (useBoards, useTasks) only fire when the palette is
 * actually visible — see the default export at the bottom of the file.
 */
const CommandPaletteInner = () => {
  const close = useCommandPaletteStore((s) => s.close);
  const openShortcutHelp = useShortcutHelpStore((s) => s.open);
  const openTaskForm = useUiStore((s) => s.openTaskForm);
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard);
  const { data: boards } = useBoards();
  const { data: tasks } = useTasks({});
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Reset on open, focus the input on the next tick so it exists.
  useEffect(() => {
    setQuery('');
    setActive(0);
    window.setTimeout(() => inputRef.current?.focus(), 10);
  }, []);

  const items: Item[] = useMemo(() => {
    const actions: Item[] = [
      {
        id: 'new-task',
        label: 'New task',
        hint: 'n',
        group: 'Actions',
        run: () => { close(); openTaskForm(null); },
      },
      {
        id: 'go-list',
        label: 'Go to List',
        hint: 'g l',
        group: 'Actions',
        run: () => { close(); navigate('/'); },
      },
      {
        id: 'go-board',
        label: 'Go to Board',
        hint: 'g b',
        group: 'Actions',
        run: () => { close(); navigate('/board'); },
      },
      {
        id: 'go-stats',
        label: 'Go to Stats',
        hint: 'g s',
        group: 'Actions',
        run: () => { close(); navigate('/stats'); },
      },
      {
        id: 'go-analytics',
        label: 'Go to Analytics',
        hint: 'g a',
        group: 'Actions',
        run: () => { close(); navigate('/analytics'); },
      },
      {
        id: 'help',
        label: 'Show keyboard shortcuts',
        hint: '?',
        group: 'Actions',
        run: () => { close(); openShortcutHelp(); },
      },
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
      run: () => { close(); openTaskForm(t.id); },
    }));

    return [...actions, ...boardItems, ...taskItems];
  }, [boards, tasks, close, openTaskForm, openShortcutHelp, navigate, setActiveBoard]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items.slice(0, 12);
    const q = query.toLowerCase();
    return items
      .filter(
        (i) =>
          i.label.toLowerCase().includes(q) ||
          (i.hint ?? '').toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [items, query]);

  // Keep the highlight in range when the list narrows, and scroll it into view.
  useEffect(() => {
    if (active >= filtered.length) setActive(0);
  }, [filtered.length, active]);

  useEffect(() => {
    // jsdom does not implement scrollIntoView; guard so tests do not crash
    // while the real browser keeps the scrolling behaviour.
    const el = listRef.current?.querySelectorAll('li')[active];
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [active]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      filtered[active]?.run();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center bg-black/50 p-4 pt-[15vh]"
      onClick={close}
      role="presentation"
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-hairline bg-surface shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a command, board or task…"
          aria-label="Command palette search"
          autoComplete="off"
          spellCheck={false}
          className="w-full border-b border-hairline bg-transparent px-5 py-4 text-base text-ink placeholder:text-ink-muted focus:outline-none"
        />

        {filtered.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-muted">No matches.</p>
        ) : (
          <ul ref={listRef} className="max-h-[50vh] overflow-y-auto py-1.5">
            {filtered.map((item, i) => (
              <li key={item.id}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={item.run}
                  className={
                    'flex w-full items-center justify-between gap-3 px-5 py-2.5 text-left text-sm transition-colors ' +
                    (i === active ? 'bg-accent/10 text-ink' : 'text-ink-muted hover:bg-surface-2')
                  }
                >
                  <span className="truncate">
                    <span className="mr-2 text-[10px] uppercase tracking-wider text-ink-muted/60">
                      {item.group}
                    </span>
                    {item.label}
                  </span>
                  {item.hint && (
                    <kbd className="shrink-0 text-[10px] text-ink-muted">{item.hint}</kbd>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

/**
 * Mounted unconditionally by the app, but the inner component (and therefore
 * its useBoards / useTasks calls) only mounts while the palette is open, so
 * opening Ctrl+K is the first thing that fetches the task list.
 */
const CommandPalette = () => {
  const isOpen = useCommandPaletteStore((s) => s.isOpen);
  return isOpen ? <CommandPaletteInner /> : null;
};

export default CommandPalette;
