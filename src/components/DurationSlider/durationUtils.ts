/**
 * Duration parsing and formatting utilities
 */

import type { DurationUnit, RangePreset, FormatOptions, DurationMark } from './types';

/** Milliseconds per unit */
const MS_PER_UNIT: Record<DurationUnit, number> = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/** Unit display order (largest to smallest) */
const UNIT_ORDER: DurationUnit[] = ['d', 'h', 'm', 's', 'ms'];

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
export function parseDuration(
  input: string,
  defaultUnit: DurationUnit = 's'
): number | null {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  // Plain number - use default unit
  if (/^[\d.]+$/.test(trimmed)) {
    const num = parseFloat(trimmed);
    if (isNaN(num) || num < 0) return null;
    return num * MS_PER_UNIT[defaultUnit];
  }

  // Parse compound duration like "1h30m", "1h 30m", "1d 2h 30m"
  // Regex matches: optional spaces, number (with optional decimal), unit
  const pattern = /(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)/gi;
  let totalMs = 0;
  let hasMatch = false;
  let match: RegExpExecArray | null;

  // Reset lastIndex for global regex
  pattern.lastIndex = 0;

  while ((match = pattern.exec(trimmed)) !== null) {
    hasMatch = true;
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase() as DurationUnit;

    if (isNaN(value) || value < 0) return null;
    if (!(unit in MS_PER_UNIT)) return null;

    totalMs += value * MS_PER_UNIT[unit];
  }

  if (!hasMatch) return null;

  return Math.round(totalMs);
}

/**
 * Format milliseconds as a human-readable duration string.
 *
 * @param ms - Duration in milliseconds
 * @param options - Formatting options
 * @returns Formatted string like "1h 30m" or "1h30m"
 */
export function formatDuration(
  ms: number,
  options: FormatOptions = {}
): string {
  const { minUnit = 's', compact = false, maxParts = 2 } = options;

  if (ms < 0) return '0s';
  if (ms === 0) return `0${minUnit === 'ms' ? 'ms' : minUnit}`;

  const minUnitIndex = UNIT_ORDER.indexOf(minUnit);
  const parts: string[] = [];
  let remaining = ms;

  for (let i = 0; i < UNIT_ORDER.length && parts.length < maxParts; i++) {
    const unit = UNIT_ORDER[i];
    const msPerUnit = MS_PER_UNIT[unit];

    // Skip units larger than remaining or smaller than minUnit
    if (i > minUnitIndex) continue;

    if (remaining >= msPerUnit) {
      const unitValue = Math.floor(remaining / msPerUnit);
      remaining = remaining % msPerUnit;
      parts.push(`${unitValue}${unit}`);
    }
  }

  // If we have remaining ms and haven't reached maxParts, show as decimal on last unit
  if (parts.length === 0) {
    // Value is smaller than minUnit, show as decimal
    const minUnitMs = MS_PER_UNIT[minUnit];
    const value = ms / minUnitMs;
    if (value < 0.1) {
      return `0${minUnit}`;
    }
    return `${value.toFixed(1).replace(/\.0$/, '')}${minUnit}`;
  }

  return parts.join(compact ? '' : ' ');
}

/**
 * Get min/max range from a preset.
 *
 * @param preset - Range preset name
 * @returns Object with min and max in milliseconds
 */
export function getRangeFromPreset(preset: RangePreset): { min: number; max: number } {
  const ranges: Record<RangePreset, { min: number; max: number }> = {
    '0-1h': { min: 0, max: MS_PER_UNIT.h },
    '0-6h': { min: 0, max: 6 * MS_PER_UNIT.h },
    '0-24h': { min: 0, max: 24 * MS_PER_UNIT.h },
    '0-7d': { min: 0, max: 7 * MS_PER_UNIT.d },
    '0-30d': { min: 0, max: 30 * MS_PER_UNIT.d },
  };

  return ranges[preset];
}

/**
 * Generate evenly-spaced duration marks for a range.
 *
 * @param min - Minimum value in ms
 * @param max - Maximum value in ms
 * @param count - Number of marks to generate (default: 5)
 * @returns Array of DurationMark objects
 */
export function generateDurationMarks(
  min: number,
  max: number,
  count: number = 5
): DurationMark[] {
  const marks: DurationMark[] = [];
  const step = (max - min) / (count - 1);

  for (let i = 0; i < count; i++) {
    const value = Math.round(min + step * i);
    marks.push({
      value,
      label: formatDuration(value, { compact: true }),
    });
  }

  return marks;
}

/**
 * Convert DurationMark array to SliderMark array (milliseconds).
 * Handles string values like "30m" and numeric millisecond values.
 *
 * @param marks - Array of DurationMark
 * @param defaultUnit - Default unit for plain numbers
 * @returns Array with value in ms and label
 */
export function convertMarksToMs(
  marks: DurationMark[],
  defaultUnit: DurationUnit = 's'
): { value: number; label: string }[] {
  return marks.map((mark) => {
    const valueMs =
      typeof mark.value === 'number'
        ? mark.value
        : parseDuration(mark.value, defaultUnit) ?? 0;

    const label =
      mark.label ?? formatDuration(valueMs, { compact: true });

    return { value: valueMs, label };
  });
}

/**
 * Determine recommended scale based on range span.
 * Wider ranges benefit from non-linear scales.
 *
 * @param min - Minimum value in ms
 * @param max - Maximum value in ms
 * @returns Recommended scale preset
 */
export function getRecommendedScale(
  min: number,
  max: number
): 'linear' | 'cubic' {
  const span = max - min;
  const oneHour = MS_PER_UNIT.h;

  // Use cubic for ranges > 1 hour
  return span > oneHour ? 'cubic' : 'linear';
}

// Re-export for convenience
export { MS_PER_UNIT };
