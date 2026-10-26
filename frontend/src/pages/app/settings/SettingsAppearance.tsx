import React, { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../../../store/themeStore';
import { getDensity, applyDensity, type Density } from '../../../lib/density';
import { PageHeader, Section } from './primitives';

const SettingsAppearance: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const [density, setDensityState] = useState<Density>(() => getDensity());

  const setDensity = (d: Density) => {
    applyDensity(d);
    setDensityState(d);
  };

  return (
    <div>
      <PageHeader title="Appearance" description="How Tudu looks and feels." />

      <Section title="Theme">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            aria-label="Dark"
            aria-pressed={theme === 'dark'}
            onClick={() => setTheme('dark')}
            className={
              'flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ' +
              (theme === 'dark'
                ? 'border-brand bg-brand-subtle'
                : 'border-line hover:border-line-strong')
            }
          >
            <Moon
              className={
                'h-4 w-4 ' +
                (theme === 'dark' ? 'text-brand' : 'text-ink-muted')
              }
            />
            <div>
              <p className="text-sm font-medium text-ink">Dark</p>
              <p className="text-[11px] text-ink-faint">Grey with tudu green</p>
            </div>
          </button>

          <button
            type="button"
            aria-label="Light"
            aria-pressed={theme === 'light'}
            onClick={() => setTheme('light')}
            className={
              'flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ' +
              (theme === 'light'
                ? 'border-brand bg-brand-subtle'
                : 'border-line hover:border-line-strong')
            }
          >
            <Sun
              className={
                'h-4 w-4 ' +
                (theme === 'light' ? 'text-brand' : 'text-ink-muted')
              }
            />
            <div>
              <p className="text-sm font-medium text-ink">Light</p>
              <p className="text-[11px] text-ink-faint">Paper and ink</p>
            </div>
          </button>
        </div>
      </Section>

      <Section
        title="Density"
        description="Compact shrinks padding and font sizes so more fits on screen."
      >
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            aria-label="Comfortable"
            aria-pressed={density === 'comfortable'}
            onClick={() => setDensity('comfortable')}
            className={
              'rounded-lg border p-4 text-left transition-colors ' +
              (density === 'comfortable'
                ? 'border-brand bg-brand-subtle'
                : 'border-line hover:border-line-strong')
            }
          >
            <p className="text-sm font-medium text-ink">Comfortable</p>
            <p className="mt-1 text-[11px] text-ink-faint">Default spacing</p>
            <div className="mt-3 space-y-1.5">
              <div className="h-1.5 rounded bg-line-subtle" />
              <div className="h-1.5 rounded bg-line-subtle" />
              <div className="h-1.5 rounded bg-line-subtle" />
            </div>
          </button>

          <button
            type="button"
            aria-label="Compact"
            aria-pressed={density === 'compact'}
            onClick={() => setDensity('compact')}
            className={
              'rounded-lg border p-3 text-left transition-colors ' +
              (density === 'compact'
                ? 'border-brand bg-brand-subtle'
                : 'border-line hover:border-line-strong')
            }
          >
            <p className="text-sm font-medium text-ink">Compact</p>
            <p className="mt-1 text-[11px] text-ink-faint">Tighter spacing</p>
            <div className="mt-2 space-y-0.5">
              <div className="h-1 rounded bg-line-subtle" />
              <div className="h-1 rounded bg-line-subtle" />
              <div className="h-1 rounded bg-line-subtle" />
              <div className="h-1 rounded bg-line-subtle" />
              <div className="h-1 rounded bg-line-subtle" />
            </div>
          </button>
        </div>

        <p className="text-[11px] text-ink-faint">
          Tip: press{' '}
          <kbd className="rounded border border-line bg-raised px-1 font-mono text-[10px]">
            Ctrl+Shift+D
          </kbd>{' '}
          anywhere in the app to toggle.
        </p>
      </Section>
    </div>
  );
};

export default SettingsAppearance;