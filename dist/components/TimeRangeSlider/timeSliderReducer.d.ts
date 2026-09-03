import { RangeValue } from '@react-types/shared';
import { DateTime, Data as D, Duration } from 'effect';
import { AnimationOrStepMode, AnimationRequestFrequency, AnimationSpeed, PlayMode, TimeDuration, TimeZone } from './timeSliderTypes';
/** Provenance of a selection write. Exported for the reducer tests. */
export declare enum UpdateSource {
    ExternalProp = 0,
    UserInteraction = 1,
    TrackLatestUpdate = 2,
    /** A step button press. Distinct from a scrub: it continues a step sequence. */
    Step = 3,
    /** A frame from the animation clock, fixed-rate or back-pressure. */
    Animation = 4
}
/**
 * Why the selection changed, as reported to `onDateRangeSelect`. Goal #1 of the
 * datetime work is stated in terms of *why* a date moved, so a poll-driven
 * re-base must not reach the consumer looking like a user scrub.
 *
 * `'external'` is not emitted today: a change arriving on the `dateRange` prop
 * is not echoed back to the consumer that sent it.
 */
export type DateUpdateSource = 'external' | 'user' | 'step' | 'animation' | 'track-latest';
export declare const toDateUpdateSource: (source: UpdateSource) => DateUpdateSource;
export type State = {
    timeZone: TimeZone;
    increment: TimeDuration;
    viewStartDateTime: DateTime.DateTime;
    viewDuration: Duration.Duration;
    resetStartDateTime: DateTime.DateTime;
    resetDuration: Duration.Duration;
    selectedStartDateTime: DateTime.DateTime;
    selectedDuration: Duration.Duration;
    stepCursor: DateTime.DateTime | null;
    animationOrStepMode: AnimationOrStepMode;
    resetAnimationSpeed: AnimationSpeed;
    resetAnimationDuration: Duration.Duration;
    animationStartDateTime: DateTime.DateTime;
    animationDuration: Duration.Duration;
    animationRequestFrequency: AnimationRequestFrequency;
    animationPlayMode: PlayMode;
    animationSpeed: AnimationSpeed;
    isTrackingLatest: boolean;
    lastKnownLatestDate: DateTime.DateTime | null;
};
/**
 * Actions for reducer
 */
export type Action = D.TaggedEnum<{
    SetTimeZone: {
        timeZone: TimeZone;
    };
    ExtSetTimeZone: {
        timeZone: TimeZone;
    };
    SetIncrement: {
        increment: TimeDuration;
    };
    ExtSetIncrement: {
        increment: TimeDuration;
    };
    SetViewStartDateTime: {
        viewStartDateTime: DateTime.DateTime;
    };
    SetViewDuration: {
        viewDuration: Duration.Duration;
    };
    HandleResize: {
        newViewDuration: Duration.Duration;
        shouldCenter: boolean;
    };
    SetResetStartDateTime: {
        resetStartDateTime: DateTime.DateTime;
    };
    SetResetDuration: {
        resetDuration: Duration.Duration;
    };
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
    SetAnimationOrStepMode: {
        animationOrStepMode: AnimationOrStepMode;
    };
    SetAnimationStartDateTime: {
        animationStartDateTime: DateTime.DateTime;
    };
    SetAnimationDuration: {
        animationDuration: Duration.Duration;
    };
    SetAnimationRequestFrequency: {
        animationRequestFrequency: AnimationRequestFrequency;
    };
    SetAnimationPlayMode: {
        playMode: PlayMode;
    };
    SetAnimationSpeed: {
        animationSpeed: AnimationSpeed;
    };
    SetResetAnimationSpeed: {
        resetAnimationSpeed: AnimationSpeed;
    };
    SetTrackingLatest: {
        isTrackingLatest: boolean;
    };
    SetLastKnownLatestDate: {
        lastKnownLatestDate: DateTime.DateTime | null;
    };
    ResetAll: object;
}>;
export declare const $actionMatch: {
    <const Cases extends {
        readonly SetTimeZone: (args: {
            readonly _tag: "SetTimeZone";
            readonly timeZone: TimeZone;
        }) => any;
        readonly ExtSetTimeZone: (args: {
            readonly _tag: "ExtSetTimeZone";
            readonly timeZone: TimeZone;
        }) => any;
        readonly SetIncrement: (args: {
            readonly _tag: "SetIncrement";
            readonly increment: TimeDuration;
        }) => any;
        readonly ExtSetIncrement: (args: {
            readonly _tag: "ExtSetIncrement";
            readonly increment: TimeDuration;
        }) => any;
        readonly SetViewStartDateTime: (args: {
            readonly _tag: "SetViewStartDateTime";
            readonly viewStartDateTime: DateTime.DateTime;
        }) => any;
        readonly SetViewDuration: (args: {
            readonly _tag: "SetViewDuration";
            readonly viewDuration: Duration.Duration;
        }) => any;
        readonly HandleResize: (args: {
            readonly _tag: "HandleResize";
            readonly newViewDuration: Duration.Duration;
            readonly shouldCenter: boolean;
        }) => any;
        readonly SetResetStartDateTime: (args: {
            readonly _tag: "SetResetStartDateTime";
            readonly resetStartDateTime: DateTime.DateTime;
        }) => any;
        readonly SetResetDuration: (args: {
            readonly _tag: "SetResetDuration";
            readonly resetDuration: Duration.Duration;
        }) => any;
        readonly ExtSetSelectedStartDateTime: (args: {
            readonly _tag: "ExtSetSelectedStartDateTime";
            readonly selectedStartDateTime: DateTime.DateTime;
            readonly updateSource: UpdateSource;
        }) => any;
        readonly SetSelectedStartDateTime: (args: {
            readonly _tag: "SetSelectedStartDateTime";
            readonly selectedStartDateTime: DateTime.DateTime;
            readonly updateSource: UpdateSource;
        }) => any;
        readonly SetSelectedDuration: (args: {
            readonly _tag: "SetSelectedDuration";
            readonly selectedDuration: Duration.Duration;
            readonly updateSource: UpdateSource;
        }) => any;
        readonly ExtSetSelectedDuration: (args: {
            readonly _tag: "ExtSetSelectedDuration";
            readonly selectedDuration: Duration.Duration;
            readonly updateSource: UpdateSource;
        }) => any;
        readonly SetAnimationOrStepMode: (args: {
            readonly _tag: "SetAnimationOrStepMode";
            readonly animationOrStepMode: AnimationOrStepMode;
        }) => any;
        readonly SetAnimationStartDateTime: (args: {
            readonly _tag: "SetAnimationStartDateTime";
            readonly animationStartDateTime: DateTime.DateTime;
        }) => any;
        readonly SetAnimationDuration: (args: {
            readonly _tag: "SetAnimationDuration";
            readonly animationDuration: Duration.Duration;
        }) => any;
        readonly SetAnimationRequestFrequency: (args: {
            readonly _tag: "SetAnimationRequestFrequency";
            readonly animationRequestFrequency: AnimationRequestFrequency;
        }) => any;
        readonly SetAnimationPlayMode: (args: {
            readonly _tag: "SetAnimationPlayMode";
            readonly playMode: PlayMode;
        }) => any;
        readonly SetAnimationSpeed: (args: {
            readonly _tag: "SetAnimationSpeed";
            readonly animationSpeed: AnimationSpeed;
        }) => any;
        readonly SetResetAnimationSpeed: (args: {
            readonly _tag: "SetResetAnimationSpeed";
            readonly resetAnimationSpeed: AnimationSpeed;
        }) => any;
        readonly SetTrackingLatest: (args: {
            readonly _tag: "SetTrackingLatest";
            readonly isTrackingLatest: boolean;
        }) => any;
        readonly SetLastKnownLatestDate: (args: {
            readonly _tag: "SetLastKnownLatestDate";
            readonly lastKnownLatestDate: DateTime.DateTime | null;
        }) => any;
        readonly ResetAll: (args: {
            readonly _tag: "ResetAll";
        }) => any;
    }>(cases: Cases & { [K in Exclude<keyof Cases, "SetTimeZone" | "ExtSetTimeZone" | "SetIncrement" | "ExtSetIncrement" | "SetViewStartDateTime" | "SetViewDuration" | "HandleResize" | "SetResetStartDateTime" | "SetResetDuration" | "ExtSetSelectedStartDateTime" | "SetSelectedStartDateTime" | "SetSelectedDuration" | "ExtSetSelectedDuration" | "SetAnimationOrStepMode" | "SetAnimationStartDateTime" | "SetAnimationDuration" | "SetAnimationRequestFrequency" | "SetAnimationPlayMode" | "SetAnimationSpeed" | "SetResetAnimationSpeed" | "SetTrackingLatest" | "SetLastKnownLatestDate" | "ResetAll">]: never; }): (value: {
        readonly _tag: "SetTimeZone";
        readonly timeZone: TimeZone;
    } | {
        readonly _tag: "ExtSetTimeZone";
        readonly timeZone: TimeZone;
    } | {
        readonly _tag: "SetIncrement";
        readonly increment: TimeDuration;
    } | {
        readonly _tag: "ExtSetIncrement";
        readonly increment: TimeDuration;
    } | {
        readonly _tag: "SetViewStartDateTime";
        readonly viewStartDateTime: DateTime.DateTime;
    } | {
        readonly _tag: "SetViewDuration";
        readonly viewDuration: Duration.Duration;
    } | {
        readonly _tag: "HandleResize";
        readonly newViewDuration: Duration.Duration;
        readonly shouldCenter: boolean;
    } | {
        readonly _tag: "SetResetStartDateTime";
        readonly resetStartDateTime: DateTime.DateTime;
    } | {
        readonly _tag: "SetResetDuration";
        readonly resetDuration: Duration.Duration;
    } | {
        readonly _tag: "ExtSetSelectedStartDateTime";
        readonly selectedStartDateTime: DateTime.DateTime;
        readonly updateSource: UpdateSource;
    } | {
        readonly _tag: "SetSelectedStartDateTime";
        readonly selectedStartDateTime: DateTime.DateTime;
        readonly updateSource: UpdateSource;
    } | {
        readonly _tag: "SetSelectedDuration";
        readonly selectedDuration: Duration.Duration;
        readonly updateSource: UpdateSource;
    } | {
        readonly _tag: "ExtSetSelectedDuration";
        readonly selectedDuration: Duration.Duration;
        readonly updateSource: UpdateSource;
    } | {
        readonly _tag: "SetAnimationOrStepMode";
        readonly animationOrStepMode: AnimationOrStepMode;
    } | {
        readonly _tag: "SetAnimationStartDateTime";
        readonly animationStartDateTime: DateTime.DateTime;
    } | {
        readonly _tag: "SetAnimationDuration";
        readonly animationDuration: Duration.Duration;
    } | {
        readonly _tag: "SetAnimationRequestFrequency";
        readonly animationRequestFrequency: AnimationRequestFrequency;
    } | {
        readonly _tag: "SetAnimationPlayMode";
        readonly playMode: PlayMode;
    } | {
        readonly _tag: "SetAnimationSpeed";
        readonly animationSpeed: AnimationSpeed;
    } | {
        readonly _tag: "SetResetAnimationSpeed";
        readonly resetAnimationSpeed: AnimationSpeed;
    } | {
        readonly _tag: "SetTrackingLatest";
        readonly isTrackingLatest: boolean;
    } | {
        readonly _tag: "SetLastKnownLatestDate";
        readonly lastKnownLatestDate: DateTime.DateTime | null;
    } | {
        readonly _tag: "ResetAll";
    }) => import('effect/Unify').Unify<ReturnType<Cases["SetTimeZone" | "ExtSetTimeZone" | "SetIncrement" | "ExtSetIncrement" | "SetViewStartDateTime" | "SetViewDuration" | "HandleResize" | "SetResetStartDateTime" | "SetResetDuration" | "ExtSetSelectedStartDateTime" | "SetSelectedStartDateTime" | "SetSelectedDuration" | "ExtSetSelectedDuration" | "SetAnimationOrStepMode" | "SetAnimationStartDateTime" | "SetAnimationDuration" | "SetAnimationRequestFrequency" | "SetAnimationPlayMode" | "SetAnimationSpeed" | "SetResetAnimationSpeed" | "SetTrackingLatest" | "SetLastKnownLatestDate" | "ResetAll"]>>;
    <const Cases extends {
        readonly SetTimeZone: (args: {
            readonly _tag: "SetTimeZone";
            readonly timeZone: TimeZone;
        }) => any;
        readonly ExtSetTimeZone: (args: {
            readonly _tag: "ExtSetTimeZone";
            readonly timeZone: TimeZone;
        }) => any;
        readonly SetIncrement: (args: {
            readonly _tag: "SetIncrement";
            readonly increment: TimeDuration;
        }) => any;
        readonly ExtSetIncrement: (args: {
            readonly _tag: "ExtSetIncrement";
            readonly increment: TimeDuration;
        }) => any;
        readonly SetViewStartDateTime: (args: {
            readonly _tag: "SetViewStartDateTime";
            readonly viewStartDateTime: DateTime.DateTime;
        }) => any;
        readonly SetViewDuration: (args: {
            readonly _tag: "SetViewDuration";
            readonly viewDuration: Duration.Duration;
        }) => any;
        readonly HandleResize: (args: {
            readonly _tag: "HandleResize";
            readonly newViewDuration: Duration.Duration;
            readonly shouldCenter: boolean;
        }) => any;
        readonly SetResetStartDateTime: (args: {
            readonly _tag: "SetResetStartDateTime";
            readonly resetStartDateTime: DateTime.DateTime;
        }) => any;
        readonly SetResetDuration: (args: {
            readonly _tag: "SetResetDuration";
            readonly resetDuration: Duration.Duration;
        }) => any;
        readonly ExtSetSelectedStartDateTime: (args: {
            readonly _tag: "ExtSetSelectedStartDateTime";
            readonly selectedStartDateTime: DateTime.DateTime;
            readonly updateSource: UpdateSource;
        }) => any;
        readonly SetSelectedStartDateTime: (args: {
            readonly _tag: "SetSelectedStartDateTime";
            readonly selectedStartDateTime: DateTime.DateTime;
            readonly updateSource: UpdateSource;
        }) => any;
        readonly SetSelectedDuration: (args: {
            readonly _tag: "SetSelectedDuration";
            readonly selectedDuration: Duration.Duration;
            readonly updateSource: UpdateSource;
        }) => any;
        readonly ExtSetSelectedDuration: (args: {
            readonly _tag: "ExtSetSelectedDuration";
            readonly selectedDuration: Duration.Duration;
            readonly updateSource: UpdateSource;
        }) => any;
        readonly SetAnimationOrStepMode: (args: {
            readonly _tag: "SetAnimationOrStepMode";
            readonly animationOrStepMode: AnimationOrStepMode;
        }) => any;
        readonly SetAnimationStartDateTime: (args: {
            readonly _tag: "SetAnimationStartDateTime";
            readonly animationStartDateTime: DateTime.DateTime;
        }) => any;
        readonly SetAnimationDuration: (args: {
            readonly _tag: "SetAnimationDuration";
            readonly animationDuration: Duration.Duration;
        }) => any;
        readonly SetAnimationRequestFrequency: (args: {
            readonly _tag: "SetAnimationRequestFrequency";
            readonly animationRequestFrequency: AnimationRequestFrequency;
        }) => any;
        readonly SetAnimationPlayMode: (args: {
            readonly _tag: "SetAnimationPlayMode";
            readonly playMode: PlayMode;
        }) => any;
        readonly SetAnimationSpeed: (args: {
            readonly _tag: "SetAnimationSpeed";
            readonly animationSpeed: AnimationSpeed;
        }) => any;
        readonly SetResetAnimationSpeed: (args: {
            readonly _tag: "SetResetAnimationSpeed";
            readonly resetAnimationSpeed: AnimationSpeed;
        }) => any;
        readonly SetTrackingLatest: (args: {
            readonly _tag: "SetTrackingLatest";
            readonly isTrackingLatest: boolean;
        }) => any;
        readonly SetLastKnownLatestDate: (args: {
            readonly _tag: "SetLastKnownLatestDate";
            readonly lastKnownLatestDate: DateTime.DateTime | null;
        }) => any;
        readonly ResetAll: (args: {
            readonly _tag: "ResetAll";
        }) => any;
    }>(value: {
        readonly _tag: "SetTimeZone";
        readonly timeZone: TimeZone;
    } | {
        readonly _tag: "ExtSetTimeZone";
        readonly timeZone: TimeZone;
    } | {
        readonly _tag: "SetIncrement";
        readonly increment: TimeDuration;
    } | {
        readonly _tag: "ExtSetIncrement";
        readonly increment: TimeDuration;
    } | {
        readonly _tag: "SetViewStartDateTime";
        readonly viewStartDateTime: DateTime.DateTime;
    } | {
        readonly _tag: "SetViewDuration";
        readonly viewDuration: Duration.Duration;
    } | {
        readonly _tag: "HandleResize";
        readonly newViewDuration: Duration.Duration;
        readonly shouldCenter: boolean;
    } | {
        readonly _tag: "SetResetStartDateTime";
        readonly resetStartDateTime: DateTime.DateTime;
    } | {
        readonly _tag: "SetResetDuration";
        readonly resetDuration: Duration.Duration;
    } | {
        readonly _tag: "ExtSetSelectedStartDateTime";
        readonly selectedStartDateTime: DateTime.DateTime;
        readonly updateSource: UpdateSource;
    } | {
        readonly _tag: "SetSelectedStartDateTime";
        readonly selectedStartDateTime: DateTime.DateTime;
        readonly updateSource: UpdateSource;
    } | {
        readonly _tag: "SetSelectedDuration";
        readonly selectedDuration: Duration.Duration;
        readonly updateSource: UpdateSource;
    } | {
        readonly _tag: "ExtSetSelectedDuration";
        readonly selectedDuration: Duration.Duration;
        readonly updateSource: UpdateSource;
    } | {
        readonly _tag: "SetAnimationOrStepMode";
        readonly animationOrStepMode: AnimationOrStepMode;
    } | {
        readonly _tag: "SetAnimationStartDateTime";
        readonly animationStartDateTime: DateTime.DateTime;
    } | {
        readonly _tag: "SetAnimationDuration";
        readonly animationDuration: Duration.Duration;
    } | {
        readonly _tag: "SetAnimationRequestFrequency";
        readonly animationRequestFrequency: AnimationRequestFrequency;
    } | {
        readonly _tag: "SetAnimationPlayMode";
        readonly playMode: PlayMode;
    } | {
        readonly _tag: "SetAnimationSpeed";
        readonly animationSpeed: AnimationSpeed;
    } | {
        readonly _tag: "SetResetAnimationSpeed";
        readonly resetAnimationSpeed: AnimationSpeed;
    } | {
        readonly _tag: "SetTrackingLatest";
        readonly isTrackingLatest: boolean;
    } | {
        readonly _tag: "SetLastKnownLatestDate";
        readonly lastKnownLatestDate: DateTime.DateTime | null;
    } | {
        readonly _tag: "ResetAll";
    }, cases: Cases & { [K in Exclude<keyof Cases, "SetTimeZone" | "ExtSetTimeZone" | "SetIncrement" | "ExtSetIncrement" | "SetViewStartDateTime" | "SetViewDuration" | "HandleResize" | "SetResetStartDateTime" | "SetResetDuration" | "ExtSetSelectedStartDateTime" | "SetSelectedStartDateTime" | "SetSelectedDuration" | "ExtSetSelectedDuration" | "SetAnimationOrStepMode" | "SetAnimationStartDateTime" | "SetAnimationDuration" | "SetAnimationRequestFrequency" | "SetAnimationPlayMode" | "SetAnimationSpeed" | "SetResetAnimationSpeed" | "SetTrackingLatest" | "SetLastKnownLatestDate" | "ResetAll">]: never; }): import('effect/Unify').Unify<ReturnType<Cases["SetTimeZone" | "ExtSetTimeZone" | "SetIncrement" | "ExtSetIncrement" | "SetViewStartDateTime" | "SetViewDuration" | "HandleResize" | "SetResetStartDateTime" | "SetResetDuration" | "ExtSetSelectedStartDateTime" | "SetSelectedStartDateTime" | "SetSelectedDuration" | "ExtSetSelectedDuration" | "SetAnimationOrStepMode" | "SetAnimationStartDateTime" | "SetAnimationDuration" | "SetAnimationRequestFrequency" | "SetAnimationPlayMode" | "SetAnimationSpeed" | "SetResetAnimationSpeed" | "SetTrackingLatest" | "SetLastKnownLatestDate" | "ResetAll"]>>;
}, SetTimeZone: D.Case.Constructor<{
    readonly _tag: "SetTimeZone";
    readonly timeZone: TimeZone;
}, "_tag">, ExtSetTimeZone: D.Case.Constructor<{
    readonly _tag: "ExtSetTimeZone";
    readonly timeZone: TimeZone;
}, "_tag">, ExtSetIncrement: D.Case.Constructor<{
    readonly _tag: "ExtSetIncrement";
    readonly increment: TimeDuration;
}, "_tag">, SetViewStartDateTime: D.Case.Constructor<{
    readonly _tag: "SetViewStartDateTime";
    readonly viewStartDateTime: DateTime.DateTime;
}, "_tag">, SetViewDuration: D.Case.Constructor<{
    readonly _tag: "SetViewDuration";
    readonly viewDuration: Duration.Duration;
}, "_tag">, HandleResize: D.Case.Constructor<{
    readonly _tag: "HandleResize";
    readonly newViewDuration: Duration.Duration;
    readonly shouldCenter: boolean;
}, "_tag">, SetResetStartDateTime: D.Case.Constructor<{
    readonly _tag: "SetResetStartDateTime";
    readonly resetStartDateTime: DateTime.DateTime;
}, "_tag">, SetResetDuration: D.Case.Constructor<{
    readonly _tag: "SetResetDuration";
    readonly resetDuration: Duration.Duration;
}, "_tag">, SetSelectedStartDateTime: D.Case.Constructor<{
    readonly _tag: "SetSelectedStartDateTime";
    readonly selectedStartDateTime: DateTime.DateTime;
    readonly updateSource: UpdateSource;
}, "_tag">, ExtSetSelectedStartDateTime: D.Case.Constructor<{
    readonly _tag: "ExtSetSelectedStartDateTime";
    readonly selectedStartDateTime: DateTime.DateTime;
    readonly updateSource: UpdateSource;
}, "_tag">, SetSelectedDuration: D.Case.Constructor<{
    readonly _tag: "SetSelectedDuration";
    readonly selectedDuration: Duration.Duration;
    readonly updateSource: UpdateSource;
}, "_tag">, ExtSetSelectedDuration: D.Case.Constructor<{
    readonly _tag: "ExtSetSelectedDuration";
    readonly selectedDuration: Duration.Duration;
    readonly updateSource: UpdateSource;
}, "_tag">, SetAnimationOrStepMode: D.Case.Constructor<{
    readonly _tag: "SetAnimationOrStepMode";
    readonly animationOrStepMode: AnimationOrStepMode;
}, "_tag">, SetAnimationStartDateTime: D.Case.Constructor<{
    readonly _tag: "SetAnimationStartDateTime";
    readonly animationStartDateTime: DateTime.DateTime;
}, "_tag">, SetAnimationDuration: D.Case.Constructor<{
    readonly _tag: "SetAnimationDuration";
    readonly animationDuration: Duration.Duration;
}, "_tag">, SetAnimationPlayMode: D.Case.Constructor<{
    readonly _tag: "SetAnimationPlayMode";
    readonly playMode: PlayMode;
}, "_tag">, SetAnimationSpeed: D.Case.Constructor<{
    readonly _tag: "SetAnimationSpeed";
    readonly animationSpeed: AnimationSpeed;
}, "_tag">, SetTrackingLatest: D.Case.Constructor<{
    readonly _tag: "SetTrackingLatest";
    readonly isTrackingLatest: boolean;
}, "_tag">, SetLastKnownLatestDate: D.Case.Constructor<{
    readonly _tag: "SetLastKnownLatestDate";
    readonly lastKnownLatestDate: DateTime.DateTime | null;
}, "_tag">, ResetAll: D.Case.Constructor<{
    readonly _tag: "ResetAll";
}, "_tag">;
/**
 * Constants
 */
export declare const DEFAULT_ANIMATION_DURATION: Duration.Duration;
export declare const reducer: (state: State, action: Action, roundingFn?: (dateTime: DateTime.DateTime) => DateTime.DateTime) => State;
/**
 * Middleware for executing external side-effects
 */
export declare function withMiddleware(reducer: (state: State, action: Action, roundingFn?: (dateTime: DateTime.DateTime) => DateTime.DateTime) => State, onDateRangeSelect: (rv: RangeValue<Date>, source: DateUpdateSource) => void, roundingFn: (dateTime: DateTime.DateTime) => DateTime.DateTime, onTimeZoneChange?: (timeZone: TimeZone) => void, onAnimationOrStepModeChange?: (mode: AnimationOrStepMode) => void, onTrackLatestChange?: (enabled: boolean) => void): (state: State, action: Action) => State;
