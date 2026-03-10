import { RangeValue } from '@react-types/shared';
import { AnimationOrStepMode, AnimationRequestFrequency, TimeDuration, Theme as AppTheme, TimeZone } from './timeSliderTypes';
/**
 * Local types for state, actions, and props
 */
export interface TimeRangeSliderProps {
    dateRange?: RangeValue<Date>;
    dateRangeForReset?: RangeValue<Date>;
    onDateRangeSelect: (rv: RangeValue<Date>) => void;
    getLatestDateRange?: () => Promise<Date>;
    animationRequestFrequency?: AnimationRequestFrequency;
    className?: string;
    theme?: AppTheme;
    timeZone?: TimeZone;
    onTimeZoneChange?: (timeZone: TimeZone) => void;
    onAnimationOrStepModeChange?: (mode: AnimationOrStepMode) => void;
    increment?: TimeDuration;
    hideAnimationToggle?: boolean;
    /** When provided, shows the animation toggle in a disabled state with this tooltip message */
    disabledAnimationTooltip?: string;
}
/**
 * Exported component
 */
export declare const TimeRangeSlider: ({ dateRange, dateRangeForReset, onDateRangeSelect, getLatestDateRange, animationRequestFrequency, className, theme, timeZone, onTimeZoneChange, onAnimationOrStepModeChange, increment, hideAnimationToggle, disabledAnimationTooltip, }: TimeRangeSliderProps) => import("react/jsx-runtime").JSX.Element;
