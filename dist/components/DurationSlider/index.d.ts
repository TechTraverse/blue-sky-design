/**
 * DurationSlider barrel exports
 */
export { DurationSlider, default } from './DurationSlider';
export type { DurationSliderProps, DurationMark, DurationUnit, RangePreset, FormatOptions, } from './types';
export { parseDuration, formatDuration, getRangeFromPreset, generateDurationMarks, convertMarksToMs, getRecommendedScale, MS_PER_UNIT, } from './durationUtils';
