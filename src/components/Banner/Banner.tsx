import { useState } from 'react';
import { MdWarningAmber, MdInfo, MdVerifiedUser, MdExpandMore } from 'react-icons/md';
import './banner.css';

export interface BannerProps {
  /** The variant/type of banner to display */
  variant?: 'info' | 'warning' | 'official';
  /** Optional title/heading for the banner */
  title?: string;
  /** Main message or content to display */
  message?: string;
  /** Optional children for custom content */
  children?: React.ReactNode;
  /** Whether the banner can be collapsed/expanded */
  collapsible?: boolean;
  /** Initial collapsed state (only applicable if collapsible is true) */
  defaultCollapsed?: boolean;
  /** Whether to remove the max-width constraint and allow content to span full width */
  fullWidth?: boolean;
  /** Optional className for additional styling */
  className?: string;
}

/**
 * Government Banner component for displaying official notices, warnings, and informational messages.
 * Inspired by USWDS design patterns but flexible for various use cases.
 */
export const Banner = ({
  variant = 'info',
  title,
  message,
  children,
  collapsible = false,
  defaultCollapsed = true,
  fullWidth = false,
  className = '',
}: BannerProps) => {
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed);

  const variantClass = `gov-banner--${variant}`;
  const expandedClass = isExpanded ? 'gov-banner--expanded' : '';
  const fullWidthClass = fullWidth ? 'gov-banner--full-width' : '';

  const toggleExpanded = () => {
    if (collapsible) {
      setIsExpanded(!isExpanded);
    }
  };

  const getIcon = () => {
    const iconProps = { className: 'gov-banner__icon', 'aria-hidden': true };

    switch (variant) {
      case 'warning':
        return <MdWarningAmber {...iconProps} />;
      case 'official':
        return <MdVerifiedUser {...iconProps} />;
      default:
        return <MdInfo {...iconProps} />;
    }
  };

  return (
    <div className={`gov-banner ${variantClass} ${fullWidthClass} ${className}`} role="region" aria-label="Government banner">
      <div className="gov-banner__header">
        <div className="gov-banner__header-content">
          {getIcon()}
          <div className="gov-banner__header-text">
            {!collapsible && title && <div className="gov-banner__title">{title}</div>}
            {!collapsible && message && <div className="gov-banner__message">{message}</div>}
            {collapsible && (
              <button
                className="gov-banner__toggle"
                onClick={toggleExpanded}
                aria-expanded={isExpanded}
                aria-controls="gov-banner-content"
              >
                <span className="gov-banner__toggle-text">
                  {title || 'Important information'}
                </span>
                <MdExpandMore
                  className={`gov-banner__toggle-icon ${expandedClass}`}
                  aria-hidden="true"
                />
              </button>
            )}
          </div>
        </div>
      </div>

      {(collapsible && isExpanded) && (
        <div
          id="gov-banner-content"
          className="gov-banner__content"
        >
          {message && <p className="gov-banner__message">{message}</p>}
          {children}
        </div>
      )}

      {!collapsible && children && (
        <div className="gov-banner__content">
          {children}
        </div>
      )}
    </div>
  );
};
