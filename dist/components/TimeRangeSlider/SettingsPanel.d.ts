import { AnimationOrStepMode, TimeDuration, Theme as AppTheme } from './timeSliderTypes';
import { Duration } from 'effect';
export interface SettingsPanelProps {
    timeZone: 'local' | 'utc';
    onTimeZoneChange: (timeZone: 'local' | 'utc') => void;
    theme: AppTheme;
    onThemeChange?: (theme: AppTheme) => void;
    currentMode: AnimationOrStepMode;
    stepDuration?: Duration.Duration;
    onStepDurationChange?: (duration: Duration.Duration) => void;
    rangeValue?: TimeDuration;
    setRange?: (timeDuration: TimeDuration) => void;
}
export declare const SettingsPanel: ({ timeZone, onTimeZoneChange, theme, onThemeChange, currentMode, rangeValue, setRange, }: SettingsPanelProps) => import("react/jsx-runtime").JSX.Element;
