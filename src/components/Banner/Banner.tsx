import { useId, useState } from 'react';
import { MdWarningAmber, MdInfo, MdVerifiedUser, MdExpandMore, MdClose } from 'react-icons/md';
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
  /** Whether to show a close button that removes the banner */
  dismissible?: boolean;
  /** Called after the banner is dismissed, e.g. to remember the choice */
  onDismiss?: () => void;
  /** Use tighter padding and smaller text */
  compact?: boolean;
  /** Short text shown after the title, visible while the banner is collapsed */
  summary?: string;
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
  dismissible = false,
  onDismiss,
  compact = false,
  summary,
}: BannerProps) => {
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed);
  const [isDismissed, setIsDismissed] = useState(false);
  const contentId = useId();

  if (isDismissed) {
    return null;
  }

  const expandedClass = isExpanded ? 'expanded' : '';
  const fullWidthClass = fullWidth ? 'fullWidth' : '';
  const hideTextMobileClass = hideTextOnMobile ? 'hideTextMobile' : '';
  const compactClass = compact ? 'compact' : '';

  const dismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

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
    <div className={`banner ${variant} ${fullWidthClass} ${hideTextMobileClass} ${compactClass} ${className}`} role="region" aria-label={title || 'Banner'}>
      <div className="bannerHeader">
        <div className="bannerHeaderContent">
          {logoSrc ? (
            <img src={logoSrc} alt={logoAlt} className="bannerLogo" />
          ) : (
            getIcon()
          )}
          <div className="bannerHeaderText">
            {!collapsible && title && (
              <div className="bannerTitle">
                {title}
                {summary && <span className="bannerSummary"> — {summary}</span>}
              </div>
            )}
            {!collapsible && message && <div className="bannerMessage">{message}</div>}
            {collapsible && (
              <button
                className="bannerToggle"
                onClick={toggleExpanded}
                aria-expanded={isExpanded}
                aria-controls={contentId}
              >
                <span className="bannerToggleText">
                  {title || 'Important information'}
                  {summary && <span className="bannerSummary"> — {summary}</span>}
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
          {dismissible && (
            <button
              type="button"
              className="bannerDismiss"
              onClick={dismiss}
              aria-label={`Dismiss ${title || 'banner'}`}
            >
              <MdClose aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {(collapsible && isExpanded) && (
        <div
          id={contentId}
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
