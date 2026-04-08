/**
 * Type definitions for DurationSlider component
 */

import type { ScalePreset } from '../ScaledRangeSlider';

/** Supported duration units */
export type DurationUnit = 'ms' | 's' | 'm' | 'h' | 'd';

/** Duration mark with string-based value */
export interface DurationMark {
  /** Duration string like "30m", "1h", or millisecond number */
  value: string | number;
  /** Label to display (defaults to formatted value) */
  label?: string;
}

/** Preset range configurations */
export type RangePreset = '0-1h' | '0-6h' | '0-24h' | '0-7d' | '0-30d';

/** Format options for duration display */
export interface FormatOptions {
  /** Smallest unit to display (default: 's') */
  minUnit?: DurationUnit;
  /** Compact format without spaces (default: false) */
  compact?: boolean;
  /** Maximum number of unit parts to show (default: 2) */
  maxParts?: number;
}

/** Main DurationSlider props */
export interface DurationSliderProps {
  /** Current value in milliseconds */
  value: number;

  /** Minimum value in milliseconds (default: 0) */
  min?: number;

  /** Maximum value in milliseconds (default: 3600000 = 1h) */
  max?: number;

  /** Preset range (overrides min/max) */
  rangePreset?: RangePreset;

  /**
   * Scale configuration for non-linear slider behavior.
   * Default: 'cubic' for wide ranges, 'linear' for narrow ranges.
   */
  scale?: ScalePreset;

  /**
   * Called during drag/input changes (high frequency).
   * Use for immediate visual feedback.
   */
  onChange?: (valueMs: number) => void;

  /**
   * Called when user commits a change (releases slider or blurs input).
   * Use for triggering side effects like API calls.
   */
  onChangeCommitted?: (valueMs: number) => void;

  /** Marks/labels to display at specific durations */
  marks?: DurationMark[] | 'auto';

  /** Whether to show the text input (default: true) */
  showInput?: boolean;

  /** Position of text input relative to slider */
  inputPosition?: 'start' | 'end';

  /** Label for the slider */
  label?: string;

  /** Accessible label (uses label if not provided) */
  'aria-label'?: string;

  /** Whether the slider is disabled */
  disabled?: boolean;

  /** Additional CSS class name */
  className?: string;

  /** Theme variant */
  theme?: 'light' | 'dark';

  /** Default unit when user enters plain number (default: 's') */
  defaultUnit?: DurationUnit;

  /** Smallest unit to display in formatted output (default: 's') */
  minDisplayUnit?: DurationUnit;
}
