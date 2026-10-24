import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code2, Webhook, Check } from 'lucide-react';
import { TileHeader, useTileInView, wait, Cursor } from './shared';
import { twMerge } from 'tailwind-merge';

const tileClass =
  'relative overflow-hidden rounded-xl border border-line bg-surface p-5 transition-colors duration-300 hover:border-line-strong';

const CURL_LINE = 'curl /api/v1/tasks -H "Authorization: Bearer tudu_…"';

export const PublicApiTile: React.FC<{ className?: string }> = ({ className }) => {
  const { ref, inView } = useTileInView();
  const [typed, setTyped] = useState('');
  const [showResponse, setShowResponse] = useState(false);

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    const run = async () => {
      while (!cancelled) {
        setTyped('');
        setShowResponse(false);
        await wait(500);
        if (cancelled) return;
        for (let i = 1; i <= CURL_LINE.length; i += 1) {
          if (cancelled) return;
          setTyped(CURL_LINE.slice(0, i));
          await wait(22);
        }
        await wait(500);
        if (cancelled) return;
        setShowResponse(true);
        await wait(2800);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [inView]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
      data-spotlight=""
      className={twMerge(tileClass, className)}
    >
      <TileHeader
        title="Public API"
        icon={<Code2 className="h-3.5 w-3.5" />}
        hint="REST · JSON"
      />
      <div className="mt-4 min-h-[130px] rounded-md border border-line bg-black/40 p-2.5 font-mono text-[10.5px] leading-relaxed">
        <div className="text-brand">$</div>
        <div className="mt-0.5 break-all text-ink">
          {typed}
          {typed.length > 0 && typed.length < CURL_LINE.length && <Cursor />}
        </div>
        <AnimatePresence>
          {showResponse && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-1.5 text-ink-muted"
            >
              <span className="text-brand">200</span> ·{' '}
              <span className="text-brand/80">application/json</span>
              <pre className="mt-1 whitespace-pre-wrap break-all text-ink">
{`{
  "count": 42,
  "items": [{ "id": "…", "title": "Ship v1" }]
}`}
              </pre>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export const WebhooksTile: React.FC<{ className?: string }> = ({ className }) => {
  const { ref, inView } = useTileInView();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    const run = async () => {
      while (!cancelled) {
        setPhase(0);
        await wait(500);
        if (cancelled) return;
        setPhase(1);
        await wait(1200);
        if (cancelled) return;
        setPhase(2);
        await wait(1200);
        if (cancelled) return;
        setPhase(3);
        await wait(2400);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [inView]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
      data-spotlight=""
      className={twMerge(tileClass, className)}
    >
      <TileHeader
        title="Webhooks"
        icon={<Webhook className="h-3.5 w-3.5" />}
        hint="POST · HMAC"
      />
      <div className="mt-4 min-h-[130px] rounded-md border border-line bg-black/40 p-2.5 font-mono text-[10.5px] leading-relaxed">
        <div className="flex items-center gap-1.5 text-ink-muted">
          <span className="text-ink-faint">GitHub</span>
          <span className="text-brand">→</span>
          <span className="text-ink-faint">tudu.app</span>
        </div>
        <AnimatePresence>
          {phase >= 1 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-1.5 text-ink-muted"
            >
              <span className="text-amber-400">POST</span>{' '}
              /api/integrations/github/webhook
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {phase >= 2 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-1 text-ink"
            >
              <pre className="whitespace-pre-wrap break-all">
{`{
  "event": "pull_request.opened",
  "action": "opened",
  "task": "TUDU-42"
}`}
              </pre>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {phase >= 3 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-1.5 flex items-center gap-1.5 text-brand"
            >
              <Check className="h-3 w-3" strokeWidth={3} />
              <span>200 OK · signature verified · task moved to In Review</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};