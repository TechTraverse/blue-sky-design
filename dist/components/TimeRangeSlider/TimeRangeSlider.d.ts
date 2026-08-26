import { RangeValue } from '@react-types/shared';
import { AnimationOrStepMode, AnimationRequestFrequency, TimeDuration, Theme as AppTheme, TimeZone } from './timeSliderTypes';
import { FrameAdvance } from './animationFrame';
/**
 * Local types for state, actions, and props
 */
export interface TimeRangeSliderProps {
    dateRange?: RangeValue<Date>;
    dateRangeForReset?: RangeValue<Date>;
    /** Constrains the selectable date range. start = earliest allowed, end = latest allowed. */
    availableDateRange?: RangeValue<Date>;
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
    /** When true, hides the date picker popup */
    hideDatePicker?: boolean;
    /** Polling interval in ms (default 60000). Set to 0 to disable polling. */
    pollingInterval?: number;
    /** Called when poll detects data newer than current selection */
    onNewDataAvailable?: (latestDate: Date, currentSelectionEnd: Date) => void;
    /** Called when tracking mode changes */
    onTrackLatestChange?: (enabled: boolean) => void;
    /** Initial tracking state (default false) */
    initialTrackLatest?: boolean;
    /**
     * How the animation clock advances between frames. Omit for the default
     * fixed-rate behavior; pass `{ mode: 'backpressure', onFrameSettled }` to gate
     * advancement on tile loads (see {@link FrameAdvance}).
     */
    frameAdvance?: FrameAdvance;
}
/**
 * Exported component
 */
export declare const TimeRangeSlider: ({ dateRange, dateRangeForReset, availableDateRange, onDateRangeSelect, getLatestDateRange, animationRequestFrequency, className, theme, timeZone, onTimeZoneChange, onAnimationOrStepModeChange, increment, hideAnimationToggle, disabledAnimationTooltip, hideDatePicker, pollingInterval, onNewDataAvailable, onTrackLatestChange, initialTrackLatest, frameAdvance, }: TimeRangeSliderProps) => import("react/jsx-runtime").JSX.Element;
