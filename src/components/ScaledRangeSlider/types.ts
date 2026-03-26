/**
 * Type definitions for ScaledRangeSlider component
 */

/** Scale function - converts display value to actual value */
export type ScaleFunction = (displayValue: number) => number;

/** Inverse scale function - converts actual value to display value */
export type InverseScaleFunction = (actualValue: number) => number;

/** Predefined scale presets */
export type ScalePreset = 'linear' | 'cubic' | 'quadratic' | 'logarithmic';

/** Color stop for track gradient */
export interface ColorStop {
  /** Threshold value (in actual units, not display units) */
  value: number;
  /** CSS color string */
  color: string;
  /** Optional label for this threshold */
  label?: string | number;
}

/** Mark configuration for slider labels */
export interface SliderMark {
  /** Value where mark appears (in actual units) */
  value: number;
  /** Label text to display */
  label: string | number;
}

/** Main ScaledRangeSlider props */
export interface ScaledRangeSliderProps {
  /** Current value in actual units (not display units) */
  value: number;

  /** Minimum value in actual units */
  min: number;

  /** Maximum value in actual units */
  max: number;

  /** Step size in actual units (default: 1) */
  step?: number;

  /**
   * Scale configuration - either a preset name or custom functions.
   * The scale transforms display position to actual value.
   * Default: 'linear'
   */
  scale?: ScalePreset | {
    scale: ScaleFunction;
    inverse: InverseScaleFunction;
  };

  /**
   * Called during drag/input changes (high frequency).
   * Use for immediate visual feedback.
   */
  onChange?: (value: number) => void;

  /**
   * Called when user commits a change (releases slider or blurs input).
   * Use for triggering side effects like API calls.
   */
  onChangeCommitted?: (value: number) => void;

  /** Color stops for track gradient (optional) */
  colorStops?: ColorStop[];

  /** Marks/labels to display at specific values */
  marks?: SliderMark[] | 'auto';

  /** Whether to show the numeric input (default: true) */
  showInput?: boolean;

  /** Position of numeric input relative to slider */
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
}
