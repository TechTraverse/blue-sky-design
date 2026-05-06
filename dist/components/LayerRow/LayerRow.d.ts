import { ReactNode } from 'react';
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
export declare const LayerRow: ({ icon, iconAlt, label, description, textOverflow, className, children, opacity, onOpacityChange, }: LayerRowProps) => import("react/jsx-runtime").JSX.Element;
