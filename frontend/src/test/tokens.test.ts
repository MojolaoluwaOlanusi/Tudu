import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Design-token drift guard.
 *
 * Vite's Vitest config sets `css: false`, so `getComputedStyle` in jsdom
 * does not resolve :root CSS variables. Instead this test parses
 * `src/index.css` directly and snapshots the token sets. Any silent change
 * to a token value (or a token going missing) fails here, so future UI
 * steps cannot drift the design system without an explicit, reviewed edit.
 *
 * Theme scoping:
 *   - `--color-*`, `--bg-*`, `--border-*`, `--text-*`, `--accent-*`,
 *     and `--status-*` must be present in BOTH `:root` and `.dark` so
 *     both themes render.
 *   - `--r-*` (radii) are theme-agnostic and cascade from `:root`; they
 *     are NOT declared in `.dark` by design.
 */

const indexPath = join(process.cwd(), 'src', 'index.css');
const rawCss = readFileSync(indexPath, 'utf8');
const css = rawCss.replace(/\/\*[\s\S]*?\*\//g, '');

const parseBlock = (source: string, selector: string): Record<string, string> => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const startRe = new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{`);
  const match = source.match(startRe);
  if (!match || match.index === undefined) return {};
  const openIdx = match.index + match[0].length - 1;
  const closeIdx = source.indexOf('}', openIdx);
  if (closeIdx === -1) return {};
  const body = source.slice(openIdx + 1, closeIdx);
  const tokens: Record<string, string> = {};
  const tokenRe = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(body)) !== null) {
    tokens[m[1].trim()] = m[2].trim().replace(/\s+/g, ' ');
  }
  return tokens;
};

const light = parseBlock(css, ':root');
const dark = parseBlock(css, '.dark');

describe('design tokens', () => {
  it('reads index.css from disk', () => {
    expect(rawCss.length).toBeGreaterThan(1000);
  });

  it('light (:root) token set', () => {
    expect(light).toMatchSnapshot('light');
  });

  it('dark (.dark) token set', () => {
    expect(dark).toMatchSnapshot('dark');
  });

  it('exposes the required tokens in each theme scope', () => {
    // Tokens that must be present in BOTH :root and .dark.
    const bothModes = [
      // live --color-* family
      '--color-bg',
      '--color-surface',
      '--color-surface-2',
      '--color-border',
      '--color-text',
      '--color-text-muted',
      '--color-accent',
      '--color-accent-strong',
      '--color-accent-soft',
      // Step-1 aliases and additive tokens
      '--bg-page',
      '--bg-surface',
      '--bg-elevated',
      '--bg-hover',
      '--bg-active',
      '--border-subtle',
      '--border-default',
      '--border-strong',
      '--text-primary',
      '--text-secondary',
      '--text-tertiary',
      '--text-inverse',
      '--accent',
      '--accent-hover',
      '--accent-subtle',
      '--accent-muted',
      '--status-todo',
      '--status-doing',
      '--status-done',
      '--status-overdue',
    ];

    // Theme-agnostic tokens that only need to exist in :root (they cascade).
    const rootOnly = ['--r-sm', '--r-md', '--r-lg'];

    for (const key of bothModes) {
      expect(light[key], `light ${key}`).toBeDefined();
      expect(dark[key], `dark ${key}`).toBeDefined();
    }
    for (const key of rootOnly) {
      expect(light[key], `light ${key}`).toBeDefined();
    }
  });

  it('aliases resolve to the existing semantic tokens in Step 1', () => {
    // Step 1 keeps every --bg-* / --border-* / --text-* / --accent-*
    // alias pointed at the matching --color-* token. Later steps may
    // harden a value to the mockup hex; when that happens this assertion
    // is meant to fail so the value change is called out in the Step
    // Review, forcing a deliberate `npx vitest -u` with justification.
    const aliasPairs: [string, string][] = [
      ['--bg-page', '--color-bg'],
      ['--bg-surface', '--color-surface'],
      ['--bg-elevated', '--color-surface-2'],
      ['--border-subtle', '--color-border'],
      ['--border-default', '--color-border'],
      ['--text-primary', '--color-text'],
      ['--text-secondary', '--color-text-muted'],
      ['--accent', '--color-accent'],
      ['--accent-hover', '--color-accent-strong'],
      ['--accent-subtle', '--color-accent-soft'],
    ];
    for (const [alias, existing] of aliasPairs) {
      expect(light[alias], `light ${alias}`).toBe(`var(${existing})`);
      expect(dark[alias], `dark ${alias}`).toBe(`var(${existing})`);
    }
  });
});