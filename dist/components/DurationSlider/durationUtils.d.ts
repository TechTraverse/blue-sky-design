import { DurationUnit, RangePreset, FormatOptions, DurationMark } from './types';
/** Milliseconds per unit */
declare const MS_PER_UNIT: Record<DurationUnit, number>;
/**
 * Parse a duration string into milliseconds.
 *
 * Supported formats:
 * - "5m" - 5 minutes
 * - "1h30m" or "1h 30m" - 1 hour 30 minutes
 * - "1.5h" - 1.5 hours (decimal)
 * - "90" - 90 seconds (with default unit)
 * - "1d 2h 30m" - compound duration
 *
 * @param input - Duration string to parse
 * @param defaultUnit - Unit to use for plain numbers (default: 's')
 * @returns Milliseconds or null if invalid
 */
export declare function parseDuration(input: string, defaultUnit?: DurationUnit): number | null;
/**
 * Format milliseconds as a human-readable duration string.
 *
 * @param ms - Duration in milliseconds
 * @param options - Formatting options
 * @returns Formatted string like "1h 30m" or "1h30m"
 */
export declare function formatDuration(ms: number, options?: FormatOptions): string;
/**
 * Get min/max range from a preset.
 *
 * @param preset - Range preset name
 * @returns Object with min and max in milliseconds
 */
export declare function getRangeFromPreset(preset: RangePreset): {
    min: number;
    max: number;
};
/**
 * Generate evenly-spaced duration marks for a range.
 *
 * @param min - Minimum value in ms
 * @param max - Maximum value in ms
 * @param count - Number of marks to generate (default: 5)
 * @returns Array of DurationMark objects
 */
export declare function generateDurationMarks(min: number, max: number, count?: number): DurationMark[];
/**
 * Convert DurationMark array to SliderMark array (milliseconds).
 * Handles string values like "30m" and numeric millisecond values.
 *
 * @param marks - Array of DurationMark
 * @param defaultUnit - Default unit for plain numbers
 * @returns Array with value in ms and label
 */
export declare function convertMarksToMs(marks: DurationMark[], defaultUnit?: DurationUnit): {
    value: number;
    label: string;
}[];
/**
 * Determine recommended scale based on range span.
 * Wider ranges benefit from non-linear scales.
 *
 * @param min - Minimum value in ms
 * @param max - Maximum value in ms
 * @returns Recommended scale preset
 */
export declare function getRecommendedScale(min: number, max: number): 'linear' | 'cubic';
export { MS_PER_UNIT };
