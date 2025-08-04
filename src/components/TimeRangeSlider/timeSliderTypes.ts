import { type DateTime } from "effect";

export enum RangeSelectionMode {
  RangeInProgress,
  FinalRangeSelected,
}

export type RangeSelection = {
  mode: RangeSelectionMode;
  start: DateTime.DateTime;
  end: DateTime.DateTime;
};

export enum TimeDuration {
  "1m" = 60000, // 1 minute in milliseconds
  "5m" = 300000, // 5 minutes in milliseconds
  "10m" = 600000, // 10 minutes in milliseconds
  "1h" = 3600000, // 1 hour in milliseconds
  "3h" = 10800000, // 3 hours in milliseconds
  "12h" = 43200000, // 12 hours in milliseconds
  "24h" = 86400000, // 24 hours in milliseconds
}
