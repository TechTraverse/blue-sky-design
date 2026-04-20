/**
 * ScaledRangeSlider barrel exports
 */

export { ScaledRangeSlider, default } from './ScaledRangeSlider';
export type {
  ScaledRangeSliderProps,
  ColorStop,
  SliderMark,
  ScalePreset,
  ScaleFunction,
  InverseScaleFunction,
} from './types';
export {
  getScaleFunctions,
  normalizeScaleConfig,
  linearScale,
  linearInverse,
  cubicScale,
  cubicInverse,
  quadraticScale,
  quadraticInverse,
  logarithmicScale,
  logarithmicInverse,
} from './scaleUtils';
export { colorStopsToGradient, colorStopsToSimpleGradient, colorStopsToMarks } from './colorUtils';
