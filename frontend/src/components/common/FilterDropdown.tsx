import React from 'react';

interface FilterDropdownProps {
  /** Explicit DOM id. When omitted, one is derived from `label`. */
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  id,
  label,
  value,
  onChange,
  options,
}) => {
  const selectId = id ?? `filter-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div>
      <label htmlFor={selectId} className="label">
        {label}
      </label>
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input cursor-pointer"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default FilterDropdown;