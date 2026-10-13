import React from 'react';
import type { TemplateDisplay } from '../../data/templates';

interface TemplateCardProps {
  template: TemplateDisplay;
  onSelect: (slug: string) => void;
  disabled?: boolean;
}

/** One card in the template picker. Same visual language as the app's modals. */
const TemplateCard: React.FC<TemplateCardProps> = ({ template, onSelect, disabled }) => (
  <button
    type="button"
    onClick={() => onSelect(template.slug)}
    disabled={disabled}
    className="group flex flex-col items-start gap-2 rounded-2xl border border-hairline bg-surface-2 p-4 text-left transition-all hover:border-accent hover:shadow-md focus:outline-none focus-visible:border-accent disabled:cursor-not-allowed disabled:opacity-60"
    aria-label={`Use the ${template.name} template`}
  >
    <div className="text-3xl" aria-hidden="true">
      {template.emoji}
    </div>
    <div>
      <p className="font-handwritten text-xl text-ink">{template.name}</p>
      <p className="mt-0.5 text-xs text-ink-muted">{template.description}</p>
    </div>
    <ul className="mt-1 space-y-0.5 text-[11px] text-ink-muted">
      {template.highlights.map((h) => (
        <li key={h}>· {h}</li>
      ))}
    </ul>
    <span className="mt-2 text-xs font-semibold text-accent opacity-0 transition-opacity group-hover:opacity-100">
      Use this template →
    </span>
  </button>
);

export default TemplateCard;
