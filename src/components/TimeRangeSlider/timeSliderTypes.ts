import type { RangeValue } from "@react-types/shared";
import { Data as D, Duration, type DateTime } from "effect";

export enum TimeDuration {
  "1m" = 60000, // 1 minute in milliseconds
  "5m" = 300000, // 5 minutes in milliseconds
  "10m" = 600000, // 10 minutes in milliseconds
  "1h" = 3600000, // 1 hour in milliseconds
  "3h" = 10800000, // 3 hours in milliseconds
  "12h" = 43200000, // 12 hours in milliseconds
  "24h" = 86400000, // 24 hours in milliseconds
}

export enum AnimationSpeed {
  '-1 hour/sec' = -(Duration.toMillis(Duration.hours(1))),
  '-30 min/sec' = -(Duration.toMillis(Duration.minutes(30))),
  '-10 min/sec' = -(Duration.toMillis(Duration.minutes(10))),
  '-5 min/sec' = -(Duration.toMillis(Duration.minutes(5))),
  '-1 min/sec' = -(Duration.toMillis(Duration.minutes(1))),
  '1 min/sec' = Duration.toMillis(Duration.minutes(1)),
  '5 min/sec' = Duration.toMillis(Duration.minutes(5)),
  '10 min/sec' = Duration.toMillis(Duration.minutes(10)),
  '30 min/sec' = Duration.toMillis(Duration.minutes(30)),
  '1 hour/sec' = Duration.toMillis(Duration.hours(1)),
}

export enum AnimationRequestFrequency {
  '1 fps' = 1000, // 1 frame per second
  '2 fps' = 500, // 2 frames per second
  '5 fps' = 200, // 5 frames per second
}

export enum PlayMode {
  Play,
  Pause,
}

export type AnimationState = D.TaggedEnum<{
  AnimationInactive: object;
  AnimationActive: {
    animationStartDateTime: DateTime.DateTime;
    animationDuration: Duration.Duration;
    animationPlayMode: PlayMode;
    animationSpeed: AnimationSpeed;
  }
}>;

export const {
  $match: $animationMatch,
  AnimationInactive,
  AnimationActive } = D.taggedEnum<AnimationState>();

export type PrimaryRange<T> = RangeValue<T> & {
  set?: (range: { start: T; end: T }) => void;
  duration: Duration.Duration;
}

export type SubRange<T> = Omit<PrimaryRange<T>, "duration"> & {
  active: boolean;
}
