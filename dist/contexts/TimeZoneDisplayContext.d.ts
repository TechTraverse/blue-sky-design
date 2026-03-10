import { DateTime } from 'effect';
import { ReactNode } from 'react';
export type TimeZoneDisplayMode = "utc" | "local";
interface TimeZoneDisplayContextValue {
    mode: TimeZoneDisplayMode;
    setMode: (mode: TimeZoneDisplayMode) => void;
    toDisplay: (dt: DateTime.DateTime) => DateTime.Zoned | DateTime.Utc;
    fromDisplay: (dt: DateTime.DateTime) => DateTime.Utc;
    getDisplayZone: () => string;
}
export declare function TimeZoneDisplayProvider({ children }: {
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function useTimeZoneDisplay(): TimeZoneDisplayContextValue;
export {};
