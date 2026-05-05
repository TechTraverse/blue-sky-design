import { ReactNode, useCallback } from 'react';
import Slider from '@mui/material/Slider';
import { MdVisibility, MdVisibilityOff } from 'react-icons/md';
import './LayerRow.css';

export interface LayerRowProps {
  /** 32x32 icon area: a URL string renders an <img>, a ReactNode renders directly */
  icon?: string | ReactNode;
  /** Alt text when icon is a URL string (defaults to label) */
  iconAlt?: string;
  /** Primary text */
  label: string;
  /** Optional secondary text below the label */
  description?: string;
  /** Whether text should truncate or wrap. Default: 'wrap' */
  textOverflow?: 'truncate' | 'wrap';
  /** Additional CSS class for the root element */
  className?: string;
  /** Trailing content (checkbox, buttons, etc.) */
  children?: ReactNode;
  /** Layer opacity (0–1). When provided with onOpacityChange, renders an opacity slider. */
  opacity?: number;
  /** Called when the user adjusts the opacity slider */
  onOpacityChange?: (opacity: number) => void;
}

export const LayerRow = ({
  icon,
  iconAlt,
  label,
  description,
  textOverflow = 'wrap',
  className = '',
  children,
  opacity,
  onOpacityChange,
}: LayerRowProps) => {
  const truncate = textOverflow === 'truncate';
  const showOpacity = opacity !== undefined && onOpacityChange !== undefined;

  const handleEyeToggle = useCallback(() => {
    if (onOpacityChange) {
      onOpacityChange((opacity ?? 1) > 0 ? 0 : 1);
    }
  }, [opacity, onOpacityChange]);

  return (
    <div className={`layer-row ${showOpacity ? 'layer-row--with-opacity' : ''} ${className}`}>
      <div className="layer-row__main">
        {icon !== undefined && (
          <div className="layer-row__icon">
            {typeof icon === 'string' ? (
              <img src={icon} alt={iconAlt ?? label} />
            ) : (
              icon
            )}
          </div>
        )}
        <div className="layer-row__content">
          <span className={`layer-row__label ${truncate ? 'layer-row__label--truncate' : ''}`}>
            {label}
          </span>
          {description && (
            <span className={`layer-row__description ${truncate ? 'layer-row__description--truncate' : ''}`}>
              {description}
            </span>
          )}
        </div>
        {children && (
          <div className="layer-row__trailing">
            {children}
          </div>
        )}
      </div>
      {showOpacity && (
        <div className="layer-row__opacity">
          <button
            className="layer-row__eye-btn"
            onClick={handleEyeToggle}
            title={(opacity ?? 1) > 0 ? 'Hide layer' : 'Show layer'}
            aria-label={(opacity ?? 1) > 0 ? `Hide ${label}` : `Show ${label}`}
          >
            {(opacity ?? 1) > 0 ? <MdVisibility /> : <MdVisibilityOff />}
          </button>
          <Slider
            size="small"
            min={0}
            max={1}
            step={0.01}
            value={opacity}
            onChange={(_e, value) => onOpacityChange(value as number)}
            aria-label={`${label} opacity`}
          />
        </div>
      )}
    </div>
  );
};
