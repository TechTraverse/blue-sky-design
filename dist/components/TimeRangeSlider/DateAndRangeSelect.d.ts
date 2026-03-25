import { DateTime } from 'effect';
import { TimeDuration, TimeZone } from './timeSliderTypes';
type RangeValue<T> = {
    start: T;
    end: T;
};
export declare const DateAndRangeSelect: ({ startDateTime, setStartDateTime, rangeValue, setRange, dateRangeForReset, availableDateRange, returnToDefaultDateTime: _returnToDefaultDateTime, timeZone: _timeZone, onTimeZoneChange: _onTimeZoneChange, }: {
    startDateTime?: DateTime.DateTime;
    setStartDateTime?: (date: DateTime.DateTime) => void;
    rangeValue?: TimeDuration;
    setRange?: (timeDuration: TimeDuration) => void;
    dateRangeForReset?: RangeValue<Date>;
    availableDateRange?: RangeValue<Date>;
    returnToDefaultDateTime?: () => void;
    timeZone?: TimeZone;
    onTimeZoneChange?: (tz: TimeZone) => void;
}) => import("react/jsx-runtime").JSX.Element;
export {};
