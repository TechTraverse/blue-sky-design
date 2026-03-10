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
export declare const Banner: ({ variant, title, message, children, collapsible, defaultCollapsed, fullWidth, className, logoSrc, logoAlt, headerActions, hideTextOnMobile, }: BannerProps) => import("react/jsx-runtime").JSX.Element;
