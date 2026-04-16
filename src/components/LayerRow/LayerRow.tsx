import { ReactNode } from 'react';
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
}

export const LayerRow = ({
  icon,
  iconAlt,
  label,
  description,
  textOverflow = 'wrap',
  className = '',
  children,
}: LayerRowProps) => {
  const truncate = textOverflow === 'truncate';

  return (
    <div className={`layer-row ${className}`}>
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
  );
};
