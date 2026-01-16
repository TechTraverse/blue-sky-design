import { useEffect, useCallback, useRef } from 'react';
import { MdClose } from 'react-icons/md';
import './SidePanel.css';

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
export const SidePanel = ({
  isOpen,
  onClose,
  children,
  title,
  position = 'left',
  className = '',
}: SidePanelProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      onClose();
    }
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  // Focus trap - focus content when opened
  useEffect(() => {
    if (isOpen && contentRef.current) {
      contentRef.current.focus();
    }
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === panelRef.current) {
      onClose();
    }
  };

  const openClass = isOpen ? 'open' : '';

  return (
    <div
      ref={panelRef}
      className={`sidePanel ${position} ${openClass} ${className}`}
      onClick={handleBackdropClick}
      aria-hidden={!isOpen}
    >
      <div
        ref={contentRef}
        className="sidePanelContent"
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Side panel'}
        tabIndex={-1}
      >
        <div className="sidePanelHeader">
          {title && <h2 className="sidePanelTitle">{title}</h2>}
          <button
            className="sidePanelClose"
            onClick={onClose}
            aria-label="Close panel"
            type="button"
          >
            <MdClose aria-hidden="true" />
          </button>
        </div>
        <div className="sidePanelBody">
          {children}
        </div>
      </div>
    </div>
  );
};
