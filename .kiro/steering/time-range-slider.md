---
inclusion: fileMatch
fileMatchPattern: ["src/components/TimeRangeSlider/**", "src/contexts/**"]
---

# TimeRangeSlider

The most complex component and the one wlfs-client leans on hardest. Its props are public API: wlfs-client's preflight checks several of them in `dist/components/TimeRangeSlider/TimeRangeSlider.d.ts` (`availableDateRange`, `animationLookahead`, `selectionMode`, ...).

## Structure

- `TimeRangeSlider.tsx`: the component and `TimeRangeSliderProps`.
- `timeSliderReducer.ts`: selection state. Every write carries an `UpdateSource` (external prop, user, track-latest rebase, step, animation frame).
- `stepping.ts`: step grid, clamping (`clampInstant`, `clampSelection`) and step sizes. `timeLabels.ts`: label formatting. `animationFrame.ts`: playback frames, lookahead and back-pressure.
- Sub-components: `AnimateAndStepControls` (one play/step control), `DateAndRangeSelect`, `HorizontalCalendar`, `StepSizeSelect`, `TimeZoneToggle`, `ControlSettings`.
- `src/contexts/TimeZoneDisplayContext.tsx`: the display zone (local or UTC) shared by the slider's parts.

## Rules

- `onDateRangeSelect(range, source)` reports **why** the selection moved (`DateUpdateSource`). A change that arrives on the `dateRange` prop is never echoed back to the consumer; it is reported as `'external'` only when a new `availableDateRange` pushes the selection back inside the bounds. Keep a poll-driven rebase from looking like a user scrub.
- `selectionMode` is `'range'` or `'instant'`. In instant mode the selection is one point; never treat it as a zero-width range.
- `availableDateRange` is `Partial<RangeValue<Date>>`: either end may be missing (an open floor or ceiling). Guard both ends.
- Steps sit on a grid (`stepMs`, `stepAnchor`, `stepPhaseMs`, or explicit `stepPositions`). Clamps refuse steps past the bounds; `onStepRequest` still fires for a refused step.
- Times are absolute; the time zone only changes display and parsing of typed times.
- Add new behavior behind optional props with defaults that keep current behavior.

## Tests

Logic lives in plain modules with focused test files (`stepping.test.ts`, `playback.test.ts`, `instantMode.test.ts`, `provenance.test.ts`, `selectionClamp.test.ts`, ...). Add a case to the matching file, or a new `<topic>.test.ts`, for any behavior change.
