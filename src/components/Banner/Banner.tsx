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
  /** Optional logo image URL to display instead of/alongside icon */
  logoSrc?: string;
  /** Optional alt text for logo image */
  logoAlt?: string;
  /** Optional actions/content to show on the right side of the header */
  headerActions?: React.ReactNode;
  /** Whether to hide title/message text on mobile (keeps logo visible) */
  hideTextOnMobile?: boolean;
}

/**
 * Banner component for displaying official notices, warnings, and informational messages.
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
  logoSrc,
  logoAlt = 'Logo',
  headerActions,
  hideTextOnMobile = false,
}: BannerProps) => {
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed);

  const expandedClass = isExpanded ? 'expanded' : '';
  const fullWidthClass = fullWidth ? 'fullWidth' : '';
  const hideTextMobileClass = hideTextOnMobile ? 'hideTextMobile' : '';

  const toggleExpanded = () => {
    if (collapsible) {
      setIsExpanded(!isExpanded);
    }
  };

  const getIcon = () => {
    const iconProps = { className: 'bannerIcon', 'aria-hidden': true };

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
    <div className={`banner ${variant} ${fullWidthClass} ${hideTextMobileClass} ${className}`} role="region" aria-label="Banner">
      <div className="bannerHeader">
        <div className="bannerHeaderContent">
          {logoSrc ? (
            <img src={logoSrc} alt={logoAlt} className="bannerLogo" />
          ) : (
            getIcon()
          )}
          <div className="bannerHeaderText">
            {!collapsible && title && <div className="bannerTitle">{title}</div>}
            {!collapsible && message && <div className="bannerMessage">{message}</div>}
            {collapsible && (
              <button
                className="bannerToggle"
                onClick={toggleExpanded}
                aria-expanded={isExpanded}
                aria-controls="banner-content"
              >
                <span className="bannerToggleText">
                  {title || 'Important information'}
                </span>
                <MdExpandMore
                  className={`bannerToggleIcon ${expandedClass}`}
                  aria-hidden="true"
                />
              </button>
            )}
          </div>
          {headerActions && (
            <div className="bannerHeaderActions">
              {headerActions}
            </div>
          )}
        </div>
      </div>

      {(collapsible && isExpanded) && (
        <div
          id="banner-content"
          className="bannerContent"
        >
          {message && <p className="bannerMessage">{message}</p>}
          {children}
        </div>
      )}

      {!collapsible && children && (
        <div className="bannerContent">
          {children}
        </div>
      )}
    </div>
  );
};
