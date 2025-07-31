import type { DateTime } from "effect";

export enum RangeSelectionMode {
  RangeInProgress,
  FinalRangeSelected,
}

export type RangeSelection = {
  mode: RangeSelectionMode;
  start: DateTime.DateTime;
  end: DateTime.DateTime;
};
