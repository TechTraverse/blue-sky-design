/**
 * Scale function utilities for ScaledRangeSlider
 *
 * Scale functions transform between "display space" (slider position) and
 * "actual space" (real values). This allows non-linear distributions like
 * cubic scaling where small values get more slider range.
 */

import type { ScaleFunction, InverseScaleFunction, ScalePreset } from './types';

// Linear scale (identity)
export const linearScale: ScaleFunction = (x) => x;
export const linearInverse: InverseScaleFunction = (x) => x;

// Cubic scale - good for values spanning multiple orders of magnitude
// Small values get more slider range, large values compress
export const cubicScale: ScaleFunction = (x) => Math.pow(x, 3);
export const cubicInverse: InverseScaleFunction = (x) => Math.pow(x, 1 / 3);

// Quadratic scale - moderate non-linearity
export const quadraticScale: ScaleFunction = (x) => Math.pow(x, 2);
export const quadraticInverse: InverseScaleFunction = (x) => Math.sqrt(Math.abs(x));

// Logarithmic scale - extreme compression of large values
// Note: Handles 0 by adding 1 before log
export const logarithmicScale: ScaleFunction = (x) => Math.log10(x + 1);
export const logarithmicInverse: InverseScaleFunction = (x) => Math.pow(10, x) - 1;

/**
 * Get scale and inverse functions for a preset name
 */
export const getScaleFunctions = (
  preset: ScalePreset
): { scale: ScaleFunction; inverse: InverseScaleFunction } => {
  switch (preset) {
    case 'cubic':
      return { scale: cubicScale, inverse: cubicInverse };
    case 'quadratic':
      return { scale: quadraticScale, inverse: quadraticInverse };
    case 'logarithmic':
      return { scale: logarithmicScale, inverse: logarithmicInverse };
    case 'linear':
    default:
      return { scale: linearScale, inverse: linearInverse };
  }
};

/**
 * Normalize scale config to always have scale/inverse functions
 */
export const normalizeScaleConfig = (
  scale: ScalePreset | { scale: ScaleFunction; inverse: InverseScaleFunction } | undefined
): { scale: ScaleFunction; inverse: InverseScaleFunction } => {
  if (!scale) {
    return getScaleFunctions('linear');
  }
  if (typeof scale === 'string') {
    return getScaleFunctions(scale);
  }
  return scale;
};
