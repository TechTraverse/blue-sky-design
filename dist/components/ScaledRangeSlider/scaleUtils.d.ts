import { ScaleFunction, InverseScaleFunction, ScalePreset } from './types';
export declare const linearScale: ScaleFunction;
export declare const linearInverse: InverseScaleFunction;
export declare const cubicScale: ScaleFunction;
export declare const cubicInverse: InverseScaleFunction;
export declare const quadraticScale: ScaleFunction;
export declare const quadraticInverse: InverseScaleFunction;
export declare const logarithmicScale: ScaleFunction;
export declare const logarithmicInverse: InverseScaleFunction;
/**
 * Get scale and inverse functions for a preset name
 */
export declare const getScaleFunctions: (preset: ScalePreset) => {
    scale: ScaleFunction;
    inverse: InverseScaleFunction;
};
/**
 * Normalize scale config to always have scale/inverse functions
 */
export declare const normalizeScaleConfig: (scale: ScalePreset | {
    scale: ScaleFunction;
    inverse: InverseScaleFunction;
} | undefined) => {
    scale: ScaleFunction;
    inverse: InverseScaleFunction;
};
