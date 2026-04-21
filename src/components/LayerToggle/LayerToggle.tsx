import { ReactNode } from 'react';
import { LayerRow } from '../LayerRow';
import './LayerToggle.css';

export interface LayerToggleProps {
  /** Unique identifier for this option */
  id: string;
  /** Display label for the option */
  label: string;
  /** Optional description text */
  description?: string;
  /** 32x32 icon area: a URL string renders an <img>, a ReactNode renders directly */
  icon?: string | ReactNode;
  /** Alt text when icon is a URL string (defaults to label) */
  iconAlt?: string;
  /** Whether this option is currently selected */
  selected?: boolean;
  /** Callback when this option is clicked */
  onSelect?: (id: string) => void;
  /** Additional CSS class */
  className?: string;
}

/** A stylized radio button option with optional icon and description */
export const LayerToggle = ({
  id,
  label,
  description,
  icon,
  iconAlt,
  selected = false,
  onSelect,
  className = '',
}: LayerToggleProps) => {
  const handleClick = () => {
    onSelect?.(id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.(id);
    }
  };

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={`layer-toggle ${selected ? 'layer-toggle--selected' : ''} ${className}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <LayerRow
        icon={icon}
        iconAlt={iconAlt ?? label}
        label={label}
        description={description}
      />
    </button>
  );
};
