import { DateTime } from "effect";
import { createContext, useContext, useState, useMemo, ReactNode } from "react";
import { TimeZone } from "../components/TimeRangeSlider/timeSliderTypes";

export type TimeZoneDisplayMode = "utc" | "local";

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

export function TimeZoneDisplayProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<TimeZoneDisplayMode>("local");

  const value = useMemo(() => ({
    mode,
    setMode,
    toDisplay: (dt: DateTime.DateTime): DateTime.Zoned | DateTime.Utc => {
      // Always normalize to UTC first
      const utc = DateTime.isZoned(dt) ? DateTime.toUtc(dt) : dt as DateTime.Utc;

      if (mode === "utc") {
        return utc;
      } else {
        const localZone = DateTime.zoneMakeLocal();
        return DateTime.setZone(utc, localZone);
      }
    },
    fromDisplay: (dt: DateTime.DateTime): DateTime.Utc => {
      return DateTime.isZoned(dt) ? DateTime.toUtc(dt) : dt as DateTime.Utc;
    },
    getDisplayZone: () => {
      return mode === "utc" ? "UTC" : DateTime.zoneToString(DateTime.zoneMakeLocal());
    }
  }), [mode]);

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
