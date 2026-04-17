import { LayerRow } from '../LayerRow';
import './LayerToggle.css';

export interface LayerToggleProps {
  /** Unique identifier for this option */
  id: string;
  /** Display label for the option */
  label: string;
  /** Optional description text */
  description?: string;
  /** Optional thumbnail image URL */
  thumbnail?: string;
  /** Alt text for thumbnail (defaults to label) */
  thumbnailAlt?: string;
  /** Whether this option is currently selected */
  selected?: boolean;
  /** Callback when this option is clicked */
  onSelect?: (id: string) => void;
  /** Additional CSS class */
  className?: string;
}

/** A stylized radio button option with optional thumbnail and description */
export const LayerToggle = ({
  id,
  label,
  description,
  thumbnail,
  thumbnailAlt,
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
        icon={thumbnail}
        iconAlt={thumbnailAlt ?? label}
        label={label}
        description={description}
      />
    </button>
  );
};
