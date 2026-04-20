import type { ColorStop } from '../ScaledRangeSlider/types';

export type { ColorStop };

/** Gradient color bar — continuous or discrete blocks */
export interface GradientVisual {
  type: 'gradient';
  colorStops: ColorStop[];
  /** If true, render hard-edged color blocks. Default: true */
  discrete?: boolean;
}

/** Single color swatch */
export interface SwatchVisual {
  type: 'swatch';
  color: string;
}

/** Raster thumbnail image */
export interface ThumbnailVisual {
  type: 'thumbnail';
  src: string;
  alt?: string;
}

/** Map icon with optional tint */
export interface IconVisual {
  type: 'icon';
  src: string;
  color?: string;
}

export type LegendVisual = GradientVisual | SwatchVisual | ThumbnailVisual | IconVisual;

export interface LegendEntry {
  id: string;
  label: string;
  visual: LegendVisual;
  disabled?: boolean;
}

export interface DynamicLegendProps {
  /** Legend entries — rendered as LegendEntryRow components. Ignored if children provided. */
  entries?: LegendEntry[];
  /** Render children directly in the legend body (for cases where each row needs its own hooks). */
  children?: React.ReactNode;
  /** Whether the legend body is collapsed */
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  /** Title shown in the header. Default: "Legend" */
  title?: string;
  className?: string;
  theme?: 'light' | 'dark';
}
