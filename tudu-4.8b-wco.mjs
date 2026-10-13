#!/usr/bin/env node
/**
 * Tudu — Feature 4.8b: Window Controls Overlay for the installed desktop PWA.
 *
 *   node tudu-4.8b-wco.mjs --dry-run
 *   node tudu-4.8b-wco.mjs
 *
 * Adds:
 *   - "display_override": ["window-controls-overlay"] to the manifest
 *   - useWindowControlsOverlay hook (visibility + titlebar rect)
 *   - AppTitleBar component rendered above the Header when WCO is active
 *   - CSS env()-based positioning + drag-region rules in index.css
 *   - Header gains an optional top padding when WCO is on, so nothing
 *     sits under the window buttons
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dryRun = process.argv.includes('--dry-run');

if (!fs.existsSync(path.join(root, 'frontend', 'vite.config.ts'))) {
  console.error('Run this from the Tudu folder (the one that contains backend/ and frontend/).');
  process.exit(2);
}

const USE_WCO = `import { useEffect, useState } from 'react';

interface TitlebarRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface WindowControlsOverlayLike extends EventTarget {
  visible: boolean;
  getTitlebarAreaRect: () => DOMRect;
}

/**
 * Reads the Window Controls Overlay geometry.
 *
 * Returns \`visible: false\` and the fallback rect on every platform that does
 * not support WCO — browsers, mobile, macOS in some versions, and any desktop
 * PWA whose manifest did not opt in. Callers treat that as "render the normal
 * header", so nothing regresses where WCO does not apply.
 */
export const useWindowControlsOverlay = () => {
  const [visible, setVisible] = useState(false);
  const [rect, setRect] = useState<TitlebarRect>({ x: 0, y: 0, width: 0, height: 0 });

  useEffect(() => {
    const wco = (navigator as unknown as { windowControlsOverlay?: WindowControlsOverlayLike })
      .windowControlsOverlay;
    if (!wco) return;

    const update = () => {
      setVisible(wco.visible);
      const r = wco.getTitlebarAreaRect();
      setRect({ x: r.x, y: r.y, width: r.width, height: r.height });
    };

    update();
    wco.addEventListener('geometrychange', update);
    return () => wco.removeEventListener('geometrychange', update);
  }, []);

  return { visible, rect };
};
`;

const APP_TITLE_BAR = `import React from 'react';
import { useWindowControlsOverlay } from '../../hooks/useWindowControlsOverlay';

/**
 * A slim drag strip that only renders when the Window Controls Overlay is
 * active. It fills the area the OS title bar would have occupied, draws a
 * subtle hairline below itself, and is fully draggable.
 *
 * Nothing here is interactive — the interactive app content lives in the
 * Header immediately below. That keeps the drag region large and the
 * no-drag exceptions to a minimum.
 */
const AppTitleBar: React.FC = () => {
  const { visible, rect } = useWindowControlsOverlay();
  if (!visible) return null;

  return (
    <div
      className="wco-drag fixed left-0 top-0 z-50 border-b border-hairline bg-surface"
      style={{
        height: rect.height || 32,
        // The overlay reserves the left edge on macOS and the right edge on
        // Windows. CSS env() gives us the free strip either way.
        marginLeft: \`env(titlebar-area-x, 0)\`,
        width: \`env(titlebar-area-width, 100%)\`,
      }}
      aria-hidden="true"
    />
  );
};

export default AppTitleBar;
`;

const INDEX_CSS_APPEND = `

/* ------------------------------------------------------------------ */
/* Desktop PWA — Window Controls Overlay (feature 4.8b)                */
/*                                                                     */
/* When the OS hands us the title bar strip via display_override, the  */
/* app fills it. The strip must be draggable to move the window;       */
/* anything interactive inside it has to say so explicitly.            */
/* ------------------------------------------------------------------ */

.wco-drag {
  -webkit-app-region: drag;
  app-region: drag;
}

.wco-no-drag,
.wco-drag button,
.wco-drag a,
.wco-drag input,
.wco-drag select,
.wco-drag [role='button'] {
  -webkit-app-region: no-drag;
  app-region: no-drag;
}

/* Add safe-area padding to the page when the overlay is present, so the */
/* Header is not hidden underneath the drag strip.                       */
@supports (padding-top: env(titlebar-area-height)) {
  html.wco-visible body {
    padding-top: env(titlebar-area-height, 0px);
  }
}
`;

const EDITS = [
  {
    file: 'frontend/vite.config.ts',
    kind: 'replace',
    why: 'Manifest: opt into window-controls-overlay',
    find: `        display: 'standalone',`,
    replace: `        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone'],`,
  },
  {
    file: 'frontend/src/hooks/useWindowControlsOverlay.ts',
    kind: 'create-only',
    why: 'useWindowControlsOverlay hook',
    body: USE_WCO,
  },
  {
    file: 'frontend/src/components/layout/AppTitleBar.tsx',
    kind: 'create-only',
    why: 'AppTitleBar drag strip',
    body: APP_TITLE_BAR,
  },
  {
    file: 'frontend/src/index.css',
    kind: 'append',
    why: 'WCO drag / no-drag rules and safe-area padding',
    body: INDEX_CSS_APPEND,
  },
  {
    file: 'frontend/src/App.tsx',
    kind: 'insert-if-missing',
    why: 'App: import AppTitleBar',
    marker: "import AppTitleBar from './components/layout/AppTitleBar';",
    insert: "import AppTitleBar from './components/layout/AppTitleBar';\n",
    anchor: "import Header from './components/layout/Header';",
    position: 'after',
  },
  {
    file: 'frontend/src/App.tsx',
    kind: 'insert-if-missing',
    why: 'App: render AppTitleBar above Header',
    marker: '<AppTitleBar />',
    insert: '<AppTitleBar />\n    ',
    anchor: '<Header />',
    position: 'before',
  },
  {
    file: 'frontend/src/App.tsx',
    kind: 'insert-if-missing',
    why: 'App: toggle html.wco-visible so the safe-area CSS applies',
    marker: 'wco-visible',
    insert: `  // Feature 4.8b — tell CSS whether the Window Controls Overlay is active.
  const { visible: wcoVisible } = useWindowControlsOverlay();
  useEffect(() => {
    document.documentElement.classList.toggle('wco-visible', wcoVisible);
  }, [wcoVisible]);

`,
    anchor: 'function App() {',
    position: 'after',
  },
  {
    file: 'frontend/src/App.tsx',
    kind: 'replace',
    why: 'App: widen the React import for useEffect',
    find: "import { lazy, Suspense, type ReactNode } from 'react';",
    replace: "import { lazy, Suspense, useEffect, type ReactNode } from 'react';",
  },
  {
    file: 'frontend/src/App.tsx',
    kind: 'insert-if-missing',
    why: 'App: import useWindowControlsOverlay',
    marker: "import { useWindowControlsOverlay } from './hooks/useWindowControlsOverlay';",
    insert: "import { useWindowControlsOverlay } from './hooks/useWindowControlsOverlay';\n",
    anchor: "import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';",
    position: 'after',
  },
];

/* --- engine --- */
const norm = (s) => s.replace(/\\r\\n/g, '\\n');
const countOccurrences = (text, needle) => (needle === '' ? 0 : text.split(needle).length - 1);
const files = new Map();
const load = (rel) => {
  if (files.has(rel)) return files.get(rel);
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    files.set(rel, { text: '', crlf: true, exists: false, changed: false });
    return files.get(rel);
  }
  const raw = fs.readFileSync(full, 'utf8').replace(/^\\uFEFF/, '');
  const state = { text: norm(raw), crlf: raw.includes('\\r\\n'), exists: true, changed: false };
  files.set(rel, state);
  return state;
};

const report = [];
const failures = [];

for (const edit of EDITS) {
  const f = load(edit.file);

  if (edit.kind === 'create-only') {
    if (f.exists) { report.push(`  skip  ${edit.file}: ${edit.why} (already exists)`); continue; }
    const body = norm(edit.body);
    f.text = body.endsWith('\\n') ? body : body + '\\n';
    f.exists = true; f.changed = true;
    report.push(`  OK    ${edit.file}: ${edit.why} (created)`);
    continue;
  }

  if (!f.exists) {
    failures.push({ ...edit, problem: 'file not found' });
    report.push(`  FAIL  ${edit.file}: ${edit.why}`);
    continue;
  }

  if (edit.kind === 'append') {
    const body = norm(edit.body);
    if (f.text.includes(body.trim())) { report.push(`  skip  ${edit.file}: ${edit.why} (already present)`); continue; }
    f.text = f.text.replace(/\\n*$/, '\\n') + body;
    f.changed = true;
    report.push(`  OK    ${edit.file}: ${edit.why} (appended)`);
    continue;
  }

  if (edit.kind === 'insert-if-missing') {
    if (f.text.includes(edit.marker)) { report.push(`  skip  ${edit.file}: ${edit.why} (already present)`); continue; }
    const anchor = norm(edit.anchor);
    const insert = norm(edit.insert);
    const n = countOccurrences(f.text, anchor);
    if (n !== 1) {
      failures.push({ ...edit, problem: `anchor matches ${n} times (expected 1)`, sample: anchor });
      report.push(`  FAIL  ${edit.file}: ${edit.why}`);
      continue;
    }
    const combined = edit.position === 'before' ? insert + anchor : anchor + '\\n' + insert.replace(/\\n$/, '');
    f.text = f.text.replace(anchor, () => combined);
    f.changed = true;
    report.push(`  OK    ${edit.file}: ${edit.why}`);
    continue;
  }

  const find = norm(edit.find);
  const replace = norm(edit.replace);
  if (f.text.includes(replace)) { report.push(`  skip  ${edit.file}: ${edit.why} (already applied)`); continue; }
  const n = countOccurrences(f.text, find);
  if (n !== 1) {
    failures.push({ ...edit, problem: `target matches ${n} times (expected 1)`, sample: find });
    report.push(`  FAIL  ${edit.file}: ${edit.why}`);
    continue;
  }
  f.text = f.text.replace(find, () => replace);
  f.changed = true;
  report.push(`  OK    ${edit.file}: ${edit.why}`);
}

console.log(`Feature 4.8b — window controls overlay${dryRun ? ' (dry run)' : ''}\\n`);
console.log(report.join('\\n'));

if (failures.length) {
  console.log(`\\n${failures.length} edit(s) failed. Nothing was written.\\n`);
  for (const x of failures) {
    console.log(`--- ${x.file}\\n    ${x.why}\\n    ${x.problem}`);
    if (x.sample) console.log('    expected to find:\\n' + x.sample.split('\\n').slice(0, 6).map((l) => '      | ' + l).join('\\n'));
  }
  process.exit(1);
}

const changed = [...files.entries()].filter(([, s]) => s.changed);
if (dryRun) { console.log(`\\nAll good: ${changed.length} file(s) would change.`); process.exit(0); }

for (const [rel, s] of changed) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, s.crlf ? s.text.replace(/\\n/g, '\\r\\n') : s.text);
}

console.log(`\\nDone: ${changed.length} file(s) written.`);
console.log('\\nNext: cd frontend && npm run build && npm run preview');