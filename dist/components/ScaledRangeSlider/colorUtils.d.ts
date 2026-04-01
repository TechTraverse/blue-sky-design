import { ColorStop, InverseScaleFunction } from './types';
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
export declare const colorStopsToGradient: (colorStops: ColorStop[], inverse: InverseScaleFunction, max: number) => string;
/**
 * Generate marks from color stops
 * Useful when marks should align with color thresholds
 */
export declare const colorStopsToMarks: (colorStops: ColorStop[]) => {
    value: number;
    label: string | number;
}[];
