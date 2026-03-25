import { DateTime } from 'effect';
import { PrimaryRange, LimitedRange, Theme as AppTheme } from './timeSliderTypes';
import { RangeValue } from '@react-types/shared';
export declare const HorizontalCalendar: ({ primaryRange, limitedRange, viewRange, earliestValidDateTime, latestValidDateTime, increment, theme, timeZone: _timeZone, }: {
    primaryRange: PrimaryRange<DateTime.DateTime>;
    limitedRange?: LimitedRange<DateTime.DateTime>;
    viewRange: RangeValue<DateTime.DateTime>;
    earliestValidDateTime?: DateTime.DateTime;
    latestValidDateTime?: DateTime.DateTime;
    increment?: number;
    theme?: AppTheme;
    timeZone?: unknown;
}) => import("react/jsx-runtime").JSX.Element;
