import React, { useState } from 'react';
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
      <PageHeader title="Appearance" description="Theme and layout density." />
      <Section title="Theme">
        <div className="flex gap-2">
          {(['light', 'dark'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              aria-pressed={theme === t}
              className={
                'flex-1 rounded-lg border px-4 py-3 text-sm font-medium capitalize transition-colors ' +
                (theme === t
                  ? 'border-brand bg-brand-subtle text-brand'
                  : 'border-line bg-surface text-ink-muted hover:border-line-strong')
              }
            >
              {t}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Density" description="Comfortable gives everything more breathing room.">
        <div className="flex gap-2">
          {(['comfortable', 'compact'] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDensity(d)}
              aria-pressed={density === d}
              className={
                'flex-1 rounded-lg border px-4 py-3 text-sm font-medium capitalize transition-colors ' +
                (density === d
                  ? 'border-brand bg-brand-subtle text-brand'
                  : 'border-line bg-surface text-ink-muted hover:border-line-strong')
              }
            >
              {d}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
};

export default SettingsAppearance;
