import type { RangeValue } from "@react-types/shared";
import { DateTime, Data as D, Duration } from 'effect';
import { match, P } from 'ts-pattern';
import { AnimationOrStepMode, AnimationRequestFrequency, AnimationSpeed, PlayMode, TimeDuration, TimeZone } from './timeSliderTypes';
import { acceptsTrackLatestRebase } from './stepping';

/** Provenance of a selection write. Exported for the reducer tests. */
export enum UpdateSource {
  ExternalProp,
  UserInteraction,
  TrackLatestUpdate,
  /** A step button press. Distinct from a scrub: it continues a step sequence. */
  Step,
  /** A frame from the animation clock, fixed-rate or back-pressure. */
  Animation
}

/**
 * Why the selection changed, as reported to `onDateRangeSelect`. Goal #1 of the
 * datetime work is stated in terms of *why* a date moved, so a poll-driven
 * re-base must not reach the consumer looking like a user scrub.
 *
 * `'external'` is not emitted today: a change arriving on the `dateRange` prop
 * is not echoed back to the consumer that sent it.
 */
export type DateUpdateSource =
  | 'external'
  | 'user'
  | 'step'
  | 'animation'
  | 'track-latest';

// Record, not a ts-pattern match: it is the only total mapping a numeric enum
// gets, so adding an UpdateSource without a public name fails to compile.
const DATE_UPDATE_SOURCE: Record<UpdateSource, DateUpdateSource> = {
  [UpdateSource.ExternalProp]: 'external',
  [UpdateSource.UserInteraction]: 'user',
  [UpdateSource.Step]: 'step',
  [UpdateSource.Animation]: 'animation',
  [UpdateSource.TrackLatestUpdate]: 'track-latest',
};

export const toDateUpdateSource = (source: UpdateSource): DateUpdateSource =>
  DATE_UPDATE_SOURCE[source];

// Also a Record, for the same reason: a new source must state whether it counts
// as the user taking over, rather than inheriting an answer from a denylist.
const DISABLES_TRACKING: Record<UpdateSource, boolean> = {
  [UpdateSource.ExternalProp]: false,
  [UpdateSource.UserInteraction]: true,
  [UpdateSource.Step]: true,
  [UpdateSource.Animation]: true,
  [UpdateSource.TrackLatestUpdate]: false,
};

export type State = {
  timeZone: TimeZone;
  increment: TimeDuration;
  // The current viewable range of dates
  viewStartDateTime: DateTime.DateTime;
  viewDuration: Duration.Duration;

  // Default date and duration to reset to
  resetStartDateTime: DateTime.DateTime;
  resetDuration: Duration.Duration;

  // User-selected date range
  selectedStartDateTime: DateTime.DateTime;
  selectedDuration: Duration.Duration;

  // Position the active step sequence last landed on; null between sequences.
  // Steps walk from here, never from the shared selection cell.
  stepCursor: DateTime.DateTime | null;

  // Two modes: animation or step
  animationOrStepMode: AnimationOrStepMode;

  // Animation state for the calendar
  resetAnimationSpeed: AnimationSpeed;
  resetAnimationDuration: Duration.Duration;
  animationStartDateTime: DateTime.DateTime;
  animationDuration: Duration.Duration;
  animationRequestFrequency: AnimationRequestFrequency;
  animationPlayMode: PlayMode;
  animationSpeed: AnimationSpeed;

  // Track latest state
  isTrackingLatest: boolean;
  lastKnownLatestDate: DateTime.DateTime | null;
};

/**
 * Actions for reducer
 */

export type Action = D.TaggedEnum<{
  SetTimeZone: { timeZone: TimeZone; };
  ExtSetTimeZone: { timeZone: TimeZone; };
  SetIncrement: { increment: TimeDuration; };
  ExtSetIncrement: { increment: TimeDuration; };

  SetViewStartDateTime: { viewStartDateTime: DateTime.DateTime; };
  SetViewDuration: { viewDuration: Duration.Duration; };
  HandleResize: {
    newViewDuration: Duration.Duration;
    shouldCenter: boolean;
  };

  SetResetStartDateTime:
  { resetStartDateTime: DateTime.DateTime; };
  SetResetDuration: { resetDuration: Duration.Duration; };

  ExtSetSelectedStartDateTime: {
    selectedStartDateTime: DateTime.DateTime;
    updateSource: UpdateSource;
  };
  SetSelectedStartDateTime: {
    selectedStartDateTime: DateTime.DateTime;
    updateSource: UpdateSource;
  };
  SetSelectedDuration: {
    selectedDuration: Duration.Duration;
    updateSource: UpdateSource;
  };
  ExtSetSelectedDuration: {
    selectedDuration: Duration.Duration;
    updateSource: UpdateSource;
  };

  SetAnimationOrStepMode:
  { animationOrStepMode: AnimationOrStepMode; };

  SetAnimationStartDateTime:
  { animationStartDateTime: DateTime.DateTime; };
  SetAnimationDuration: { animationDuration: Duration.Duration; };
  SetAnimationRequestFrequency:
  { animationRequestFrequency: AnimationRequestFrequency; };
  SetAnimationPlayMode: { playMode: PlayMode; };
  SetAnimationSpeed:
  { animationSpeed: AnimationSpeed; };
  SetResetAnimationSpeed:
  { resetAnimationSpeed: AnimationSpeed; };

  SetTrackingLatest: { isTrackingLatest: boolean; };
  SetLastKnownLatestDate: { lastKnownLatestDate: DateTime.DateTime | null; };

  ResetAll: object;
}>;

export const {
  $match: $actionMatch,

  SetTimeZone,
  ExtSetTimeZone,
  ExtSetIncrement,
  SetViewStartDateTime,
  SetViewDuration,
  HandleResize,

  SetResetStartDateTime,
  SetResetDuration,

  SetSelectedStartDateTime,
  ExtSetSelectedStartDateTime,
  SetSelectedDuration,
  ExtSetSelectedDuration,

  SetAnimationOrStepMode,

  SetAnimationStartDateTime,
  SetAnimationDuration,
  SetAnimationPlayMode,
  SetAnimationSpeed,
  SetTrackingLatest,
  SetLastKnownLatestDate,
  ResetAll } = D.taggedEnum<Action>();


/**
 * Constants
 */

export const DEFAULT_ANIMATION_DURATION = Duration.hours(2);


/**
 * Helper functions
 */



const calculateOptimalViewStart = (
  _pStart: DateTime.DateTime,
  nStart: DateTime.DateTime,
  nDuration: Duration.Duration,
  cViewStart: DateTime.DateTime,
  cViewDuration: Duration.Duration,
  roundingFn: (dateTime: DateTime.DateTime) => DateTime.DateTime
): DateTime.DateTime => {
  // Check if new selection is outside current view
  const nEnd = DateTime.addDuration(nStart, nDuration);
  const cViewEnd = DateTime.addDuration(cViewStart, cViewDuration);
  const isOutsideView = DateTime.lessThan(nStart, cViewStart) || DateTime.greaterThan(nEnd, cViewEnd);

  if (isOutsideView) {
    // Center the selection in the view
    const selectionMidpoint = DateTime.addDuration(nStart, Duration.millis(Duration.toMillis(nDuration) / 2));
    const unroundedViewStart = DateTime.subtractDuration(selectionMidpoint, Duration.millis(Duration.toMillis(cViewDuration) / 2));
    return roundingFn(unroundedViewStart);
  }

  // Selection is within view, keep current view
  return cViewStart;
};

const calculateCenteredViewStart = (
  selectedStart: DateTime.DateTime,
  selectedDuration: Duration.Duration,
  viewDuration: Duration.Duration,
  roundingFn: (dateTime: DateTime.DateTime) => DateTime.DateTime
): DateTime.DateTime => {
  // Always center the selection in the view
  const selectionMidpoint = DateTime.addDuration(
    selectedStart,
    Duration.millis(Duration.toMillis(selectedDuration) / 2)
  );
  const unroundedViewStart = DateTime.subtractDuration(
    selectionMidpoint,
    Duration.millis(Duration.toMillis(viewDuration) / 2)
  );
  return roundingFn(unroundedViewStart);
};

/**
 * State management: reducer
 */

const getSetSelectedStartDateTimeAction = (state: State, roundingFn: (dateTime: DateTime.DateTime) => DateTime.DateTime) => (x: {
  selectedStartDateTime: DateTime.DateTime;
  updateSource: UpdateSource;
}) => {
  const start = x.selectedStartDateTime;

  // A track-latest re-base must not move the selection out from under an active
  // step sequence — that is what turns N clicks into N re-bases instead of N steps.
  if (x.updateSource === UpdateSource.TrackLatestUpdate && !acceptsTrackLatestRebase(state.stepCursor)) {
    return state;
  }

  // Calculate optimal view range with 5-minute alignment and padding
  const optimalViewStart = calculateOptimalViewStart(
    state.selectedStartDateTime, // Old start
    start,
    state.selectedDuration,
    state.viewStartDateTime,
    state.viewDuration,
    roundingFn
  );

  // Only update view range if selected date + duration goes outside current view range
  // Check if the selection is outside the current view
  const selectedEnd = DateTime.addDuration(start, state.selectedDuration);
  const currentViewEnd = DateTime.addDuration(state.viewStartDateTime, state.viewDuration);

  const selectionStartOutsideView = DateTime.lessThan(start, state.viewStartDateTime);
  const selectionEndOutsideView = DateTime.greaterThan(selectedEnd, currentViewEnd);

  // Only adjust view if selection is actually outside the current view
  const viewStartDateTime = (selectionStartOutsideView || selectionEndOutsideView)
    ? optimalViewStart
    : state.viewStartDateTime;

  // Auto-disable tracking when the user takes over
  const shouldDisableTracking = state.isTrackingLatest && DISABLES_TRACKING[x.updateSource];

  return {
    ...state,
    viewStartDateTime,
    selectedStartDateTime: start,
    // Only a step continues the sequence; every other writer ends it.
    stepCursor: x.updateSource === UpdateSource.Step ? start : null,
    ...(shouldDisableTracking ? { isTrackingLatest: false } : {}),
  }
}

const getSetSelectedDurationAction = (state: State, roundingFn: (dateTime: DateTime.DateTime) => DateTime.DateTime) => (x: {
  selectedDuration: Duration.Duration;
  updateSource: UpdateSource;
}) => {
  // Calculate optimal view range with new duration
  const viewStartDateTime = calculateOptimalViewStart(
    state.selectedStartDateTime,
    state.selectedStartDateTime,
    x.selectedDuration,
    state.viewStartDateTime,
    state.viewDuration,
    roundingFn
  );

  // Auto-disable tracking when the user takes over
  const shouldDisableTracking = state.isTrackingLatest && DISABLES_TRACKING[x.updateSource];

  return {
    ...state,
    viewStartDateTime,
    selectedDuration: x.selectedDuration,
    // Without an explicit stepSizeMs the width is the step, so a width change
    // moves the lattice; either way the sequence ends here.
    stepCursor: null,
    ...(shouldDisableTracking ? { isTrackingLatest: false } : {}),
  };
}

export const reducer = (state: State, action: Action, roundingFn?: (dateTime: DateTime.DateTime) => DateTime.DateTime): State => {
  // Default rounding function for 5-minute increments
  const defaultRounding = (dateTime: DateTime.DateTime): DateTime.DateTime => dateTime.pipe(
    DateTime.toParts,
    (parts) => {
      const roundedToFiveFloorMins = Math.floor(parts.minutes / 5) * 5;
      return DateTime.unsafeMake({
        ...parts,
        minutes: roundedToFiveFloorMins,
        seconds: 0,
        milliseconds: 0,
      });
    });

  const actualRoundingFn = roundingFn || defaultRounding;

  return $actionMatch({
    SetTimeZone: (x) => {

      return {
        ...state,
        timeZone: x.timeZone,
      }
    },
    ExtSetTimeZone: (x) => ({
      ...state,
      timeZone: x.timeZone,
    }),
    SetIncrement: (x) => ({
      ...state,
      increment: x.increment,
    }),
    ExtSetIncrement: (x) => ({
      ...state,
      increment: x.increment,
    }),

    SetViewStartDateTime: (x) => ({
      ...state,
      viewStartDateTime:
        actualRoundingFn(x.viewStartDateTime),
    }),
    SetViewDuration: (x) => ({
      ...state,
      viewDuration: x.viewDuration,
    }),
    HandleResize: (x) => {
      const newState = {
        ...state,
        viewDuration: x.newViewDuration,
      };

      if (x.shouldCenter) {
        const centeredViewStart = calculateCenteredViewStart(
          state.selectedStartDateTime,
          state.selectedDuration,
          x.newViewDuration,
          actualRoundingFn
        );
        return {
          ...newState,
          viewStartDateTime: centeredViewStart,
        };
      }

      return newState;
    },

    SetResetStartDateTime: (x) => ({
      ...state,
      resetStartDateTime: x.resetStartDateTime,
    }),
    SetResetDuration: (x) => ({
      ...state,
      resetDuration: x.resetDuration,
    }),

    SetSelectedStartDateTime: getSetSelectedStartDateTimeAction(state, actualRoundingFn),
    ExtSetSelectedStartDateTime: getSetSelectedStartDateTimeAction(state, actualRoundingFn),

    SetSelectedDuration: getSetSelectedDurationAction(state, actualRoundingFn),
    ExtSetSelectedDuration: getSetSelectedDurationAction(state, actualRoundingFn),

    SetAnimationOrStepMode: (x) => ({
      ...state,
      animationOrStepMode: x.animationOrStepMode,
      // Entering a repeatable mode ends any live step sequence, so a track-latest
      // re-base is no longer refused. The snap onto the lattice stays silent:
      // the selection is not rewritten, the first step absorbs it.
      stepCursor: null,
    }),

    SetAnimationStartDateTime: (x) => ({
      ...state,
      animationStartDateTime: x.animationStartDateTime,
    }),
    SetAnimationDuration: (x) => ({
      ...state,
      animationDuration: x.animationDuration,
    }),
    SetAnimationRequestFrequency: (x) => ({
      ...state,
      animationRequestFrequency: x.animationRequestFrequency,
    }),
    SetAnimationPlayMode: (x) => ({
      ...state,
      animationPlayMode: x.playMode,
    }),
    SetAnimationSpeed: (x) => ({
      ...state,
      animationSpeed: x.animationSpeed,
    }),
    SetResetAnimationSpeed: (x) => ({
      ...state,
      resetAnimationSpeed: x.resetAnimationSpeed,
    }),

    SetTrackingLatest: (x) => ({
      ...state,
      isTrackingLatest: x.isTrackingLatest,
      // Toggling tracking is an explicit end to any step sequence.
      stepCursor: null,
    }),
    SetLastKnownLatestDate: (x) => ({
      ...state,
      lastKnownLatestDate: x.lastKnownLatestDate,
    }),

    ResetAll: () => ({
      ...state,
      viewStartDateTime: state.resetStartDateTime,
      viewDuration: state.resetDuration,
      selectedStartDateTime: state.resetStartDateTime,
      selectedDuration: state.resetDuration,
      stepCursor: null,
      animationOrStepMode: AnimationOrStepMode.Step,
      animationDuration: state.resetAnimationDuration,
      animationPlayMode: PlayMode.Pause,
      animationSpeed: state.resetAnimationSpeed,
      isTrackingLatest: false,
    }),
  })(action);
}


/**
 * Middleware for executing external side-effects
 */

export function withMiddleware(
  reducer: (state: State, action: Action, roundingFn?: (dateTime: DateTime.DateTime) => DateTime.DateTime) => State,
  onDateRangeSelect: (rv: RangeValue<Date>, source: DateUpdateSource) => void,
  roundingFn: (dateTime: DateTime.DateTime) => DateTime.DateTime,
  onTimeZoneChange?: (timeZone: TimeZone) => void,
  onAnimationOrStepModeChange?: (mode: AnimationOrStepMode) => void,
  onTrackLatestChange?: (enabled: boolean) => void
): (state: State, action: Action) => State {
  return (oldState, action) => {

    // Determine latest state
    const newState = reducer(oldState, action, roundingFn);

    // Handle callbacks
    match(action)
      .with({ _tag: P.union("SetSelectedStartDateTime", "SetSelectedDuration") }, (a) => {
        const start = newState.selectedStartDateTime;
        const end = DateTime.addDuration(start, newState.selectedDuration);

        const startChanged = DateTime.distance(oldState.selectedStartDateTime, newState.selectedStartDateTime) !== 0;
        const durationChanged = Duration.toMillis(oldState.selectedDuration) !== Duration.toMillis(newState.selectedDuration);

        if (startChanged || durationChanged) {
          onDateRangeSelect({
            start: DateTime.toDate(start),
            end: DateTime.toDate(end)
          }, toDateUpdateSource(a.updateSource));
        }

        // Notify when tracking was auto-disabled due to user interaction
        if (oldState.isTrackingLatest && !newState.isTrackingLatest) {
          onTrackLatestChange?.(false);
        }
      })
      .with({ _tag: "SetTrackingLatest" }, () => {
        if (oldState.isTrackingLatest !== newState.isTrackingLatest) {
          onTrackLatestChange?.(newState.isTrackingLatest);
        }
      })
      .with({ _tag: "SetTimeZone" }, () => (newState.timeZone !== oldState.timeZone),
        () => onTimeZoneChange?.(newState.timeZone)
      )
      .with({ _tag: "SetAnimationOrStepMode" }, () => (newState.animationOrStepMode !== oldState.animationOrStepMode),
        () => onAnimationOrStepModeChange?.(newState.animationOrStepMode)
      )
    return newState;
  };
}


