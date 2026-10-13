import React from 'react';
import TemplateCard from './TemplateCard';
import { TEMPLATES } from '../../data/templates';

interface TemplatePickerProps {
  onSelect: (slug: string) => void;
  disabled?: boolean;
}

/**
 * Grid of the built-in templates. Used by the onboarding wizard (4.2) and by
 * the "Create board from template" flow (4.9), so the two stay consistent.
 */
const TemplatePicker: React.FC<TemplatePickerProps> = ({ onSelect, disabled }) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    {TEMPLATES.map((t) => (
      <TemplateCard key={t.slug} template={t} onSelect={onSelect} disabled={disabled} />
    ))}
  </div>
);

export default TemplatePicker;
