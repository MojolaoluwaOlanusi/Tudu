import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Plus, Check, Clock, User } from 'lucide-react';

type ColumnId = 'todo' | 'doing' | 'done';
type Priority = 'H' | 'M' | 'L';

interface ColumnDef {
  id: ColumnId;
  name: string;
  wipLimit: number | null;
}

interface CardDef {
  id: string;
  title: string;
  column: ColumnId;
  priority: Priority;
  due: string | null;
  timerStart?: number;
  assignee?: string | null;
}

interface LiveBoardHeroProps {
  /**
   * When `true` (default), the board runs a scripted demo loop until the
   * visitor interacts with it. When `false`, the board is interactive from
   * the first render (the pattern the mockup's `/demo` page uses).
   *
   * The auto-play loop is additionally disabled by `prefers-reduced-motion`,
   * as a partial WCAG 2.2.2 mitigation (the loop lasts indefinitely; the OS
   * "reduce motion" signal is honoured so it does not move for those users).
   */
  autoPlay?: boolean;
}

const COLUMNS: ColumnDef[] = [
  { id: 'todo', name: 'To-do', wipLimit: 3 },
  { id: 'doing', name: 'Doing', wipLimit: null },
  { id: 'done', name: 'Done', wipLimit: null },
];

const INITIAL_CARDS: CardDef[] = [
  { id: 'c1', title: 'Design new dashboard', column: 'todo', priority: 'H', due: 'Oct 24' },
  { id: 'c2', title: 'Review API spec', column: 'todo', priority: 'M', due: 'Oct 25' },
  { id: 'c3', title: 'Write launch notes', column: 'todo', priority: 'L', due: 'Oct 27' },
  { id: 'c4', title: 'Ship pricing page', column: 'doing', priority: 'H', due: 'Oct 23', timerStart: Date.now(), assignee: 'you' },
  { id: 'c5', title: 'Set up staging', column: 'done', priority: 'M', due: null },
];

const PRIORITY_STYLE: Record<Priority, string> = {
  H: 'bg-red-500/10 text-red-400',
  M: 'bg-amber-500/10 text-amber-400',
  L: 'bg-line-subtle text-ink-faint',
};

function formatTimer(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

interface CardProps {
  card: CardDef;
  onCycleStatus: (cardId: string) => void;
  onDragDrop: (cardId: string, targetColumn: ColumnId) => void;
  onInteract: () => void;
}

const Card: React.FC<CardProps> = ({ card, onCycleStatus, onDragDrop, onInteract }) => {
  const [elapsed, setElapsed] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!card.timerStart) return;
    const tick = () => setElapsed(Date.now() - card.timerStart!);
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [card.timerStart]);

  return (
    <motion.div
      drag
      dragSnapToOrigin
      dragElastic={0.15}
      onDragStart={() => {
        setDragging(true);
        onInteract();
      }}
      onDragEnd={(_, info) => {
        setDragging(false);
        const el = document.elementFromPoint(info.point.x, info.point.y);
        const colEl = el?.closest('[data-column]') as HTMLElement | null;
        const col = colEl?.dataset.column as ColumnId | undefined;
        if (col && col !== card.column) onDragDrop(card.id, col);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onCycleStatus(card.id)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={
        'relative cursor-grab rounded-md border border-line-subtle bg-raised p-3 text-left ' +
        (dragging ? 'z-50 cursor-grabbing shadow-lg' : 'shadow-sm')
      }
    >
      <div className="flex items-start gap-2">
        <div
          className={
            'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ' +
            (card.column === 'done'
              ? 'border-brand bg-brand text-ink-inverse'
              : 'border-line-strong')
          }
        >
          {card.column === 'done' && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
        </div>
        <p
          className={
            'min-w-0 flex-1 text-[13px] leading-snug ' +
            (card.column === 'done' ? 'text-ink-faint line-through' : 'text-ink')
          }
        >
          {card.title}
        </p>
        <span
          className={
            'shrink-0 rounded-sm px-1 text-[10px] font-semibold ' +
            PRIORITY_STYLE[card.priority]
          }
        >
          {card.priority}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2 pl-6 text-[11px]">
        {card.due && <span className="text-ink-faint">{card.due}</span>}
        {card.timerStart && (
          <span className="inline-flex items-center gap-1 text-ink-muted">
            <Clock className="h-3 w-3" />
            <span className="font-mono tabular-nums">{formatTimer(elapsed)}</span>
          </span>
        )}
      </div>

      <AnimatePresence>
        {hovered && card.assignee && card.column !== 'done' && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute -top-1.5 right-2 inline-flex items-center gap-1 rounded-sm border border-line bg-surface px-1.5 py-0.5 text-[10px] font-medium text-ink-muted shadow-md"
          >
            <User className="h-2.5 w-2.5" /> @{card.assignee}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

interface ColumnProps {
  column: ColumnDef;
  cards: CardDef[];
  onCycleStatus: (cardId: string) => void;
  onDragDrop: (cardId: string, targetColumn: ColumnId) => void;
  onInteract: () => void;
}

const Column: React.FC<ColumnProps> = ({
  column,
  cards,
  onCycleStatus,
  onDragDrop,
  onInteract,
}) => {
  const [hovered, setHovered] = useState(false);
  const atLimit = column.wipLimit !== null && cards.length >= column.wipLimit;
  const showWip = hovered || atLimit;

  return (
    <div
      data-column={column.id}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex min-h-0 flex-col rounded-lg border border-line-subtle bg-surface/40 p-2"
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            {column.name}
          </span>
          <span className="rounded-sm bg-line-subtle px-1.5 text-[10px] font-medium text-ink-faint">
            {cards.length}
            {column.wipLimit ? '/' + column.wipLimit : ''}
          </span>
        </div>
        <AnimatePresence>
          {showWip && column.wipLimit && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={
                'rounded-sm px-1.5 py-0.5 text-[10px] font-semibold ' +
                (atLimit ? 'bg-red-500/15 text-red-400' : 'bg-brand-subtle text-brand')
              }
            >
              WIP {cards.length}/{column.wipLimit}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="flex min-h-[180px] flex-col gap-2">
        {cards.map((card) => (
          <Card
            key={card.id}
            card={card}
            onCycleStatus={onCycleStatus}
            onDragDrop={onDragDrop}
            onInteract={onInteract}
          />
        ))}
        {cards.length === 0 && (
          <div className="flex min-h-[100px] items-center justify-center rounded-md border border-dashed border-line-subtle text-[11px] text-ink-faint">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
};

const LiveBoardHero: React.FC<LiveBoardHeroProps> = ({ autoPlay = true }) => {
  const prefersReduced = useReducedMotion();
  const effectiveAutoPlay = autoPlay && !prefersReduced;
  const [cards, setCards] = useState<CardDef[]>(INITIAL_CARDS);
  const [composer, setComposer] = useState('');
  const [isInteractive, setIsInteractive] = useState(!effectiveAutoPlay);
  const boardRef = useRef<HTMLDivElement | null>(null);

  const fireConfetti = useCallback(() => {
    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    confetti({
      particleCount: 60,
      spread: 70,
      origin: {
        x: (rect.right - 100) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight,
      },
      colors: ['#22C55E', '#16A34A', '#4ADE80', '#86EFAC'],
      disableForReducedMotion: true,
    });
  }, []);

  useEffect(() => {
    if (isInteractive) return;
    let cancelled = false;
    const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

    const run = async () => {
      while (!cancelled) {
        setCards(INITIAL_CARDS);
        setComposer('');
        await wait(1200);
        if (cancelled) return;

        const text = 'Q4 Launch';
        for (let i = 1; i <= text.length; i += 1) {
          if (cancelled) return;
          setComposer(text.slice(0, i));
          await wait(75);
        }
        await wait(400);
        if (cancelled) return;

        const newId = 'q4-' + Date.now();
        setCards((c) => [
          ...c,
          { id: newId, title: 'Q4 Launch', column: 'todo', priority: 'H', due: 'Nov 1' },
        ]);
        setComposer('');
        await wait(900);
        if (cancelled) return;

        setCards((c) =>
          c.map((card) => (card.id === newId ? { ...card, assignee: 'you' } : card)),
        );
        await wait(1000);
        if (cancelled) return;

        setCards((c) =>
          c.map((card) =>
            card.id === newId
              ? { ...card, column: 'doing', timerStart: Date.now() }
              : card,
          ),
        );
        await wait(2200);
        if (cancelled) return;

        setCards((c) =>
          c.map((card) =>
            card.id === newId ? { ...card, column: 'done', timerStart: undefined } : card,
          ),
        );
        fireConfetti();
        await wait(2800);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [isInteractive, fireConfetti]);

  const handleCycleStatus = (cardId: string) => {
    setIsInteractive(true);
    setCards((c) =>
      c.map((card) => {
        if (card.id !== cardId) return card;
        const next: ColumnId =
          card.column === 'todo' ? 'doing' : card.column === 'doing' ? 'done' : 'todo';
        if (next === 'done') fireConfetti();
        return { ...card, column: next };
      }),
    );
  };

  const handleDragDrop = (cardId: string, targetColumn: ColumnId) => {
    setIsInteractive(true);
    setCards((c) =>
      c.map((card) => (card.id === cardId ? { ...card, column: targetColumn } : card)),
    );
    if (targetColumn === 'done') fireConfetti();
  };

  const handleComposerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composer.trim()) return;
    setIsInteractive(true);
    const newId = 'manual-' + Date.now();
    setCards((c) => [
      ...c,
      { id: newId, title: composer.trim(), column: 'todo', priority: 'M', due: null },
    ]);
    setComposer('');
  };

  return (
    <div
      ref={boardRef}
      className="relative mx-auto max-w-5xl overflow-hidden rounded-xl border border-line bg-surface shadow-2xl"
    >
      <div className="flex items-center gap-2 border-b border-line-subtle px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-brand/60" />
        </div>
        <span className="ml-2 text-[11px] text-ink-faint">tudu / Sprint 12</span>
        <span className="ml-auto text-[10px] text-ink-faint">
          {isInteractive ? 'Interactive — drag or click a card' : 'Auto-playing demo'}
        </span>
      </div>

      <form
        onSubmit={handleComposerSubmit}
        className="flex gap-2 border-b border-line-subtle p-3"
      >
        <div className="flex flex-1 items-center gap-2 rounded-md border border-line bg-raised px-3 py-2">
          <Plus className="h-3.5 w-3.5 text-ink-faint" />
          <input
            type="text"
            value={composer}
            onChange={(e) => {
              setComposer(e.target.value);
              if (e.target.value) setIsInteractive(true);
            }}
            placeholder="Add a task…"
            className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-ink-faint focus:outline-none"
          />
        </div>
      </form>

      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto p-4 sm:grid sm:grid-cols-3 sm:overflow-visible sm:snap-none">
        {COLUMNS.map((column) => (
          <div
            key={column.id}
            className="min-w-[280px] flex-shrink-0 snap-start sm:min-w-0"
          >
            <Column
              column={column}
              cards={cards.filter((c) => c.column === column.id)}
              onCycleStatus={handleCycleStatus}
              onDragDrop={handleDragDrop}
              onInteract={() => setIsInteractive(true)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveBoardHero;