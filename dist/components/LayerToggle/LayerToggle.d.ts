import { ReactNode } from 'react';
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
export declare const LayerToggle: ({ id, label, description, icon, iconAlt, selected, onSelect, className, }: LayerToggleProps) => import("react/jsx-runtime").JSX.Element;
