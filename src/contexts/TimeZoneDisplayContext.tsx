/* eslint-disable react-refresh/only-export-components */
import { DateTime, Option as O } from "effect";
import { createContext, useContext, useState, useMemo, ReactNode } from "react";
import { TimeZone } from "../components/TimeRangeSlider/timeSliderTypes";

export type TimeZoneDisplayMode = TimeZone;

interface TimeZoneDisplayContextValue {
  mode: TimeZoneDisplayMode;
  setMode: (mode: TimeZoneDisplayMode) => void;
  // Convert any DateTime to the display format
  toDisplay: (dt: DateTime.DateTime) => DateTime.Zoned | DateTime.Utc;
  // Convert from display format back to internal UTC
  fromDisplay: (dt: DateTime.DateTime) => DateTime.Utc;
  // Get the current display timezone string
  getDisplayZone: () => string;
}

const TimeZoneDisplayContext = createContext<TimeZoneDisplayContextValue | null>(null);

// Create a more reliable timezone detection function using Intl API
const getReliableLocalTimezone = (): DateTime.TimeZone => {
  // Use Intl.DateTimeFormat to get the timezone identifier  
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Try to create the timezone using Effect's zoneMakeNamed
  return DateTime.zoneMakeNamed(timezone).pipe(
    O.getOrElse(() => {
      // Fallback to DateTime.zoneMakeLocal() if zoneMakeNamed fails
      console.warn(`Failed to create timezone from "${timezone}", falling back to system detection`);
      return DateTime.zoneMakeLocal();
    })
  );
};

/**
 * Pass `mode` and `onModeChange` to control the display zone from outside (the slider drives it
 * from its `timeZone` prop). Without `mode` the provider keeps its own, starting at local.
 */
export function TimeZoneDisplayProvider({ mode: controlledMode, onModeChange, children }: {
  mode?: TimeZoneDisplayMode;
  onModeChange?: (mode: TimeZoneDisplayMode) => void;
  children: ReactNode;
}) {
  const [uncontrolledMode, setUncontrolledMode] = useState<TimeZoneDisplayMode>(TimeZone.Local);
  const mode = controlledMode ?? uncontrolledMode;
  const setMode = onModeChange ?? setUncontrolledMode;

  const value = useMemo(() => ({
    mode,
    setMode,
    toDisplay: (dt: DateTime.DateTime): DateTime.Zoned | DateTime.Utc => {
      // Always normalize to UTC first
      const utc = DateTime.isZoned(dt) ? DateTime.toUtc(dt) : dt as DateTime.Utc;

      if (mode === TimeZone.UTC) {
        return utc;
      } else {
        const localZone = getReliableLocalTimezone();
        return DateTime.setZone(utc, localZone);
      }
    },
    fromDisplay: (dt: DateTime.DateTime): DateTime.Utc => {
      return DateTime.isZoned(dt) ? DateTime.toUtc(dt) : dt as DateTime.Utc;
    },
    getDisplayZone: () => {
      if (mode === TimeZone.UTC) {
        return "UTC";
      } else {
        const localZone = getReliableLocalTimezone();
        return DateTime.zoneToString(localZone);
      }
    }
  }), [mode, setMode]);

  return (
    <TimeZoneDisplayContext.Provider value={value}>
      {children}
    </TimeZoneDisplayContext.Provider>
  );
}

export function useTimeZoneDisplay() {
  const ctx = useContext(TimeZoneDisplayContext);
  if (!ctx) {
    throw new Error("useTimeZoneDisplay must be used within TimeZoneDisplayProvider");
  }
  return ctx;
}
