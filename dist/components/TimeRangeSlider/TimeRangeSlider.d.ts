import { RangeValue } from '@react-types/shared';
import { AnimationOrStepMode, AnimationRequestFrequency, TimeDuration, Theme as AppTheme, TimeZone } from './timeSliderTypes';
import { StepDirection, StepResolution } from './stepping';
import { DateUpdateSource } from './timeSliderReducer';
import { FrameAdvance } from './animationFrame';
/**
 * Local types for state, actions, and props
 */
/** Reported on every step press. The button is disabled at the ends, so `to` is
 * null only if a clamp refused a press that got through anyway. */
export interface StepRequest {
    direction: StepDirection;
    from: Date;
    /** Where the step landed, or null when a clamp refused it. */
    to: Date | null;
    /** Whether an observed frame or the lattice produced the destination. */
    resolvedBy: StepResolution;
}
export interface TimeRangeSliderProps {
    dateRange?: RangeValue<Date>;
    /** The range the reset control returns to. Not a constraint on the selection. */
    dateRangeForReset?: RangeValue<Date>;
    /**
     * The only constraint on the selection: start = earliest allowed instant,
     * end = latest. Either end may be omitted to leave that side open, and the
     * whole prop omitted to leave the selection unconstrained.
     */
    availableDateRange?: Partial<RangeValue<Date>>;
    /** Called when the selection changes, with why it changed. */
    onDateRangeSelect: (rv: RangeValue<Date>, source: DateUpdateSource) => void;
    getLatestDateRange?: () => Promise<Date>;
    animationRequestFrequency?: AnimationRequestFrequency;
    className?: string;
    theme?: AppTheme;
    timeZone?: TimeZone;
    onTimeZoneChange?: (timeZone: TimeZone) => void;
    onAnimationOrStepModeChange?: (mode: AnimationOrStepMode) => void;
    increment?: TimeDuration;
    /**
     * Distance in milliseconds the step buttons move the selection. Independent
     * of the selection width, so a 5-minute window can step 30 seconds. Whole
     * milliseconds; falls back to the selection width when omitted or not a
     * positive finite number.
     * Does not affect drag snapping, which follows `increment`.
     */
    stepSizeMs?: number;
    /**
     * Origin of the step lattice, owned by the consumer's datetime service. Steps
     * land on `stepAnchor + stepPhaseMs + k * stepSizeMs`. Omit for free-running
     * `cursor ± stepSizeMs` steps.
     *
     * A step sequence is anchored until something other than a step moves the
     * selection, so the consumer must echo `dateRange` back unchanged from
     * `onDateRangeSelect`; a rewritten value reads as a fresh external selection.
     */
    stepAnchor?: Date;
    /**
     * Offset of the lattice from `stepAnchor`, in milliseconds. Frame times do not
     * fall on a round-minute grid, so the phase cannot be derived from a clock.
     */
    stepPhaseMs?: number;
    /**
     * Observed frame instants for the current view, pushed down by the consumer's
     * frame index. Inside this span steps land on real frames; beyond it they fall
     * back to the lattice. Order does not matter. Stepping never fetches.
     * Memoise it: a new array each render re-normalises the list.
     */
    stepPositions?: readonly Date[];
    /** Called on every step press, including one a clamp refused. */
    onStepRequest?: (request: StepRequest) => void;
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
export declare const TimeRangeSlider: ({ dateRange, dateRangeForReset, availableDateRange, onDateRangeSelect, getLatestDateRange, animationRequestFrequency, className, theme, timeZone, onTimeZoneChange, onAnimationOrStepModeChange, increment, stepSizeMs, stepAnchor, stepPhaseMs, stepPositions, onStepRequest, hideAnimationToggle, disabledAnimationTooltip, hideDatePicker, pollingInterval, onNewDataAvailable, onTrackLatestChange, initialTrackLatest, frameAdvance, }: TimeRangeSliderProps) => import("react/jsx-runtime").JSX.Element;
