export interface LayerToggleProps {
    /** Unique identifier for this option */
    id: string;
    /** Display label for the option */
    label: string;
    /** Optional description text */
    description?: string;
    /** Optional thumbnail image URL */
    thumbnail?: string;
    /** Alt text for thumbnail (defaults to label) */
    thumbnailAlt?: string;
    /** Whether this option is currently selected */
    selected?: boolean;
    /** Callback when this option is clicked */
    onSelect?: (id: string) => void;
    /** Additional CSS class */
    className?: string;
}
/** A stylized radio button option with optional thumbnail and description */
export declare const LayerToggle: ({ id, label, description, thumbnail, thumbnailAlt, selected, onSelect, className, }: LayerToggleProps) => import("react/jsx-runtime").JSX.Element;
