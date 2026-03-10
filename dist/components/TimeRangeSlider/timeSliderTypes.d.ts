import { RangeValue } from '@react-types/shared';
import { Duration } from 'effect';
export declare enum AnimationOrStepMode {
    Animation = 0,
    Step = 1
}
export declare enum TimeDuration {
    "1m" = 60000,// 1 minute in milliseconds
    "5m" = 300000,// 5 minutes in milliseconds
    "10m" = 600000,// 10 minutes in milliseconds
    "30m" = 1800000,// 30 minutes in milliseconds
    "1h" = 3600000,// 1 hour in milliseconds
    "3h" = 10800000,// 3 hours in milliseconds
    "12h" = 43200000,// 12 hours in milliseconds
    "24h" = 86400000
}
export declare enum AnimationSpeed {
    '-1 hour/sec',
    '-30 min/sec',
    '-10 min/sec',
    '-5 min/sec',
    '-1 min/sec',
    '1 min/sec',
    '5 min/sec',
    '10 min/sec',
    '30 min/sec',
    '1 hour/sec'
}
export declare enum AnimationRequestFrequency {
    '1 fps' = 1000,// 1 frame per second
    '2 fps' = 500,// 2 frames per second
    '5 fps' = 200
}
export declare enum PlayMode {
    Play = 0,
    Pause = 1
}
export declare enum Theme {
    Light = "light",
    Dark = "dark"
}
export declare enum TimeZone {
    Local = "local",
    UTC = "utc"
}
export type PrimaryRange<T> = RangeValue<T> & {
    set: (range: {
        start?: T;
        end?: T;
    }) => void;
    duration: Duration.Duration;
};
export type SubRange<T> = Omit<PrimaryRange<T>, "duration" | "set"> & {
    active: boolean;
};
export type LimitedRange<T> = RangeValue<T> & {
    set: (range: {
        start?: T;
        end?: T;
    }) => void;
    duration: Duration.Duration;
};
