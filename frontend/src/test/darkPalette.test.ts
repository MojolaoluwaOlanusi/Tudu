/**
 * Targeted regression net for the Step 10 dark palette swap.
 *
 * The full token set is snapshotted by `tokens.test.ts`; this file pins the
 * *specific* values that Step 10 changed, so a future revert to the old
 * warm-grey palette fails loudly with a descriptive message rather than
 * just a snapshot mismatch.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const cssPath = join(process.cwd(), 'src', 'index.css');
const rawCss = readFileSync(cssPath, 'utf8');
const css = rawCss.replace(/\/\*[\s\S]*?\*\//g, '');

const parseDark = (): Record<string, string> => {
  const startRe = /(?:^|\n)\s*\.dark\s*\{/;
  const match = css.match(startRe);
  if (!match || match.index === undefined) return {};
  const openIdx = match.index + match[0].length - 1;
  const closeIdx = css.indexOf('}', openIdx);
  const body = css.slice(openIdx + 1, closeIdx);
  const tokens: Record<string, string> = {};
  const re = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    tokens[m[1].trim()] = m[2].trim().replace(/\s+/g, ' ');
  }
  return tokens;
};

describe('dark palette values (Step 10)', () => {
  const dark = parseDark();

  it('uses the mockup cool near-black background, not the old warm grey', () => {
    expect(dark['--color-bg']).toBe('#0E0E10');
    expect(dark['--color-bg']).not.toBe('#1a1a1a');
  });

  it('uses the mockup surface and elevated values', () => {
    expect(dark['--color-surface']).toBe('#16161A');
    expect(dark['--color-surface-2']).toBe('#1C1C21');
  });

  it('uses translucent white borders (mockup recipe)', () => {
    expect(dark['--color-border']).toBe('rgba(255, 255, 255, 0.10)');
  });

  it('keeps accent-strong bright for emphasis text on dark (not #16A34A)', () => {
    expect(dark['--color-accent-strong']).toBe('#4ade80');
  });

  it('preserves the light-mode values untouched', () => {
    const lightMatch = css.match(/(?:^|\n)\s*:root\s*\{/);
    expect(lightMatch).not.toBeNull();
    const openIdx = (lightMatch!.index ?? 0) + lightMatch![0].length - 1;
    const closeIdx = css.indexOf('}', openIdx);
    const lightBody = css.slice(openIdx + 1, closeIdx);
    expect(lightBody).toMatch(/--color-bg:\s*#fafafa/i);
    expect(lightBody).toMatch(/--color-surface:\s*#ffffff/i);
  });
});