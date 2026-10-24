import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { tokenize, clipTokens, TYPE_COLOR } from './highlight';

interface CodePanelProps {
  title: string;
  language: string;
  code: string[];
  delay?: number;
  status: string;
}

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/**
 * One of the three code cards under "Under the hood". Types the code in
 * when the panel scrolls into view, and repeats the loop while visible.
 *
 * Reduced-motion behaviour:
 *   - The panel renders the full code in a single effect tick (no per-
 *     character loop) so a reduced-motion user does not have to watch
 *     characters dribble out.
 *
 * Visibility in tests:
 *   - jsdom's IntersectionObserver stub never fires, so `inView` starts
 *     false. Callers who want to assert on the typed state mock
 *     framer-motion's `useInView` / `useReducedMotion` (see
 *     `src/test/codePanel.test.tsx`).
 */
const CodePanel: React.FC<CodePanelProps> = ({
  title,
  language,
  code,
  delay = 0,
  status,
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { margin: '-80px', once: false });
  const reduced = useReducedMotion();
  const [typed, setTyped] = useState(0);

  const allTokens = useMemo(() => code.map(tokenize), [code]);
  const totalChars = useMemo(
    () => code.reduce((sum, line) => sum + line.length + 1, 0),
    [code],
  );

  useEffect(() => {
    if (!inView) {
      setTyped(0);
      return;
    }
    if (reduced) {
      setTyped(totalChars);
      return;
    }
    let cancelled = false;
    const run = async () => {
      await wait(delay);
      while (!cancelled) {
        setTyped(0);
        await wait(300);
        for (let i = 2; i <= totalChars; i += 2) {
          if (cancelled) return;
          setTyped(i);
          await wait(20);
        }
        setTyped(totalChars);
        await wait(3000);
      }
    };
    void run();
    return () => {
      cancelled = true;
      setTyped(0);
    };
  }, [inView, reduced, delay, totalChars]);

  let lineStart = 0;
  const renderedLines = code.map((line, idx) => {
    const budget = Math.max(0, Math.min(line.length, typed - lineStart));
    const isActive = typed >= lineStart && typed <= lineStart + line.length;
    const tokens = clipTokens(allTokens[idx], budget);
    const lineEnd = lineStart + line.length + 1;
    lineStart = lineEnd;
    return { idx, line, tokens, isActive };
  });
  const lastVisibleIdx = renderedLines.reduce(
    (last, l) => (l.tokens.length > 0 ? l.idx : last),
    0,
  );

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, delay: delay / 1000, ease: [0.2, 0, 0, 1] }}
      className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm"
    >
      <div className="flex items-center gap-2 border-b border-line-subtle bg-raised/50 px-3 py-2">
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500/50" />
          <span className="h-2 w-2 rounded-full bg-amber-500/50" />
          <span className="h-2 w-2 rounded-full bg-brand/50" />
        </div>
        <span className="ml-1 rounded-sm bg-surface px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">
          {title}
        </span>
        <span className="ml-auto font-mono text-[9px] uppercase tracking-wider text-ink-faint">
          {language}
        </span>
      </div>

      <div className="h-[320px] overflow-hidden bg-[#0A0A0C] px-3 py-2 font-mono text-[11px] leading-[20px]">
        <div className="flex">
          <div className="shrink-0 select-none pr-3 text-right text-[10px] text-ink-faint/60 tabular-nums">
            {code.map((_, i) => (
              <div key={i} className="leading-[20px]">
                {i + 1}
              </div>
            ))}
          </div>
          <div className="min-w-0 flex-1 whitespace-pre">
            {renderedLines.map((r) => (
              <div key={r.idx} className="leading-[20px]">
                {r.tokens.map((t, i) => (
                  <span key={i} className={TYPE_COLOR[t.type]}>
                    {t.text}
                  </span>
                ))}
                {r.isActive && r.idx === lastVisibleIdx && !reduced && (
                  <span className="ml-px inline-block h-[14px] w-[7px] animate-pulse bg-brand align-middle" />
                )}
                {r.tokens.length === 0 && !r.isActive && (
                  <span className="text-ink-faint/0">&nbsp;</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-line-subtle bg-raised/30 px-3 py-2">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
        </span>
        <span className="truncate font-mono text-[10px] text-ink-muted">
          {status}
        </span>
      </div>
    </motion.div>
  );
};

export default CodePanel;