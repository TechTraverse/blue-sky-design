export interface SidePanelProps {
    /** Whether the panel is visible */
    isOpen: boolean;
    /** Callback when panel should close */
    onClose: () => void;
    /** Content to render inside the panel */
    children: React.ReactNode;
    /** Optional title for the header */
    title?: string;
    /** Direction the panel slides in from */
    position?: 'left' | 'right';
    /** Optional className for additional styling */
    className?: string;
}
/**
 * Slide-in side panel component with backdrop.
 * Useful for navigation menus, settings panels, and mobile-friendly sidebars.
 */
export declare const SidePanel: ({ isOpen, onClose, children, title, position, className, }: SidePanelProps) => import("react/jsx-runtime").JSX.Element;
