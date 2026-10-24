import React from 'react';
import { motion } from 'framer-motion';
import {
  AiBreakdownTile,
  CommandPaletteTile,
  FocusModeTile,
} from './bento/BigTiles';
import {
  NeverLoseWorkTile,
  BoardsThatFitTile,
  KeyboardFirstTile,
  WorkspacesTile,
} from './bento/MediumTiles';
import {
  PwaTile,
  TemplatesTile,
  SelfHostingTile,
  NotificationsTile,
  MarketplaceTile,
  IntegrationsTile,
  AnalyticsTile,
} from './bento/SmallTiles';
import { PublicApiTile, WebhooksTile } from './bento/DevTiles';

const ease = [0.2, 0, 0, 1] as const;

/** Sets --mx/--my on every [data-spotlight] tile so the cursor glow follows. */
const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
  const tiles = e.currentTarget.querySelectorAll<HTMLElement>('[data-spotlight]');
  tiles.forEach((tile) => {
    const r = tile.getBoundingClientRect();
    tile.style.setProperty('--mx', `${e.clientX - r.left}px`);
    tile.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
};

/** 16-tile bento grid showcasing the full product toolkit. */
const BentoGrid: React.FC = () => (
  <section className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
    <div className="mb-12 max-w-2xl">
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.5, ease }}
        className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint"
      >
        The full toolkit
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, delay: 0.05, ease }}
        className="text-balance text-3xl font-semibold leading-tight text-ink sm:text-4xl"
      >
        Everything you wish your boards had
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, delay: 0.1, ease }}
        className="mt-3 text-base leading-relaxed text-ink-muted"
      >
        Sixteen features Trello hides behind paywalls and Jira hides behind
        manuals — shipped in every Tudu account. Hover a tile to see it live.
      </motion.p>
    </div>

    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12"
      onMouseMove={handleMouseMove}
    >
      <AiBreakdownTile className="sm:col-span-2 lg:col-span-7" />
      <CommandPaletteTile className="sm:col-span-1 lg:col-span-5" />
      <FocusModeTile className="sm:col-span-1 lg:col-span-4" />
      <NeverLoseWorkTile className="sm:col-span-1 lg:col-span-4" />
      <BoardsThatFitTile className="sm:col-span-2 lg:col-span-4" />
      <KeyboardFirstTile className="sm:col-span-2 lg:col-span-7" />
      <WorkspacesTile className="sm:col-span-1 lg:col-span-5" />
      <PwaTile className="sm:col-span-1 lg:col-span-3" />
      <TemplatesTile className="sm:col-span-1 lg:col-span-3" />
      <SelfHostingTile className="sm:col-span-1 lg:col-span-3" />
      <NotificationsTile className="sm:col-span-1 lg:col-span-3" />
      <PublicApiTile className="sm:col-span-1 lg:col-span-6" />
      <WebhooksTile className="sm:col-span-1 lg:col-span-6" />
      <MarketplaceTile className="sm:col-span-1 lg:col-span-5" />
      <IntegrationsTile className="sm:col-span-1 lg:col-span-3" />
      <AnalyticsTile className="sm:col-span-2 lg:col-span-4" />
    </div>
  </section>
);

export default BentoGrid;