/**
 * Color utilities for ScaledRangeSlider track gradient
 */

import type { ColorStop, InverseScaleFunction } from './types';

/**
 * Convert color stops to a CSS linear-gradient string
 *
 * Creates hard color stops (no blending) so each threshold range
 * has a distinct, solid color block.
 *
 * @param colorStops - Array of {value, color} pairs in ascending value order
 * @param inverse - Inverse scale function to convert values to display positions
 * @param max - Maximum value (in actual units)
 * @returns CSS linear-gradient string
 */
export const colorStopsToGradient = (
  colorStops: ColorStop[],
  inverse: InverseScaleFunction,
  max: number
): string => {
  if (colorStops.length === 0) {
    return 'transparent';
  }

  // Sort by value ascending
  const sorted = [...colorStops].sort((a, b) => a.value - b.value);

  const maxDisplay = inverse(max);
  const stops: string[] = [];
  let prevPercent = 0;

  for (let i = 0; i < sorted.length; i++) {
    const stop = sorted[i];
    const displayVal = inverse(stop.value);
    const percent = (displayVal / maxDisplay) * 100;

    // Create hard color stops - color starts at previous position, ends at this position
    stops.push(`${stop.color} ${prevPercent}%`);
    stops.push(`${stop.color} ${percent}%`);
    prevPercent = percent;
  }

  // Extend last color to 100% if needed
  if (prevPercent < 100) {
    const lastColor = sorted[sorted.length - 1].color;
    stops.push(`${lastColor} ${prevPercent}%`);
    stops.push(`${lastColor} 100%`);
  }

  return `linear-gradient(to right, ${stops.join(', ')})`;
};

/**
 * Convert color stops to a CSS linear-gradient without requiring a scale function.
 *
 * If stops have a `width` property, blocks are sized proportionally.
 * Otherwise, blocks are distributed evenly.
 * Creates hard color stops (no blending).
 */
export const colorStopsToSimpleGradient = (
  colorStops: ColorStop[],
  direction: string = 'to right'
): string => {
  if (colorStops.length === 0) return 'transparent';

  const sorted = [...colorStops].sort((a, b) => a.value - b.value);
  const hasWidths = sorted.some((s) => s.width !== undefined);

  const stops: string[] = [];
  let cursor = 0;

  for (let i = 0; i < sorted.length; i++) {
    const stop = sorted[i];
    const blockWidth = hasWidths
      ? (stop.width ?? 1 / sorted.length) * 100
      : 100 / sorted.length;
    const startPct = cursor;
    const endPct = cursor + blockWidth;

    stops.push(`${stop.color} ${startPct}%`);
    stops.push(`${stop.color} ${endPct}%`);
    cursor = endPct;
  }

  return `linear-gradient(${direction}, ${stops.join(', ')})`;
};

/**
 * Generate marks from color stops
 * Useful when marks should align with color thresholds
 */
export const colorStopsToMarks = (
  colorStops: ColorStop[]
): { value: number; label: string | number }[] => {
  return colorStops.map((stop) => ({
    value: stop.value,
    label: stop.label ?? stop.value,
  }));
};
