/**
 * ScaledRangeSlider - A numeric slider with configurable scale functions
 *
 * Provides a slider + numeric input combo with support for non-linear scales
 * (cubic, logarithmic, etc.) and color-coded track gradients.
 *
 * Key design:
 * - Controlled component (parent owns value)
 * - `onChange` fires during drag for visual feedback
 * - `onChangeCommitted` fires on release for side effects
 * - Scale functions transform between display space and actual values
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { Slider, Input, styled } from '@mui/material';
import type { ScaledRangeSliderProps, SliderMark } from './types';
import { normalizeScaleConfig } from './scaleUtils';
import { colorStopsToGradient, colorStopsToMarks } from './colorUtils';
import './ScaledRangeSlider.css';

const StyledInput = styled(Input)`
  width: 80px;
`;

export const ScaledRangeSlider: React.FC<ScaledRangeSliderProps> = ({
  value,
  min,
  max,
  step = 1,
  scale: scaleConfig,
  onChange,
  onChangeCommitted,
  colorStops = [],
  marks: marksProp,
  showInput = true,
  inputPosition = 'start',
  label,
  'aria-label': ariaLabel,
  disabled = false,
  className,
  theme = 'dark',
}) => {
  // Normalize scale config to functions
  const { scale, inverse } = useMemo(
    () => normalizeScaleConfig(scaleConfig),
    [scaleConfig]
  );

  // Track if we're actively dragging (ref to avoid re-renders)
  const isDraggingRef = useRef(false);

  // Track local display value during drag only
  const localDisplayValueRef = useRef<number | null>(null);

  // Force update mechanism for drag visual feedback
  const [, forceUpdate] = useState(0);

  // Compute display-space bounds
  const minDisplay = useMemo(() => inverse(min), [inverse, min]);
  const maxDisplay = useMemo(() => inverse(max), [inverse, max]);

  // Current display value: local during drag, otherwise derived from prop
  const displayValue = isDraggingRef.current && localDisplayValueRef.current !== null
    ? localDisplayValueRef.current
    : inverse(value);

  // Generate track gradient from color stops
  const trackGradient = useMemo(() => {
    if (colorStops.length === 0) return undefined;
    return colorStopsToGradient(colorStops, inverse, max);
  }, [colorStops, inverse, max]);

  // Generate marks in display space
  const marks = useMemo((): { value: number; label: React.ReactNode }[] | undefined => {
    if (!marksProp) return undefined;

    const rawMarks: SliderMark[] =
      marksProp === 'auto' ? colorStopsToMarks(colorStops) : marksProp;

    return rawMarks.map((mark) => ({
      value: inverse(mark.value),
      label: mark.label,
    }));
  }, [marksProp, colorStops, inverse]);

  // Handle slider drag (high frequency)
  const handleSliderChange = useCallback(
    (_event: Event, newDisplayValue: number | number[]) => {
      const displayVal = Array.isArray(newDisplayValue)
        ? newDisplayValue[0]
        : newDisplayValue;
      isDraggingRef.current = true;
      localDisplayValueRef.current = displayVal;
      // Force re-render to show updated slider position
      forceUpdate((n) => n + 1);

      const actualValue = scale(displayVal);
      onChange?.(actualValue);
    },
    [scale, onChange]
  );

  // Handle slider release (commit)
  const handleSliderChangeCommitted = useCallback(
    (_event: React.SyntheticEvent | Event, newDisplayValue: number | number[]) => {
      const displayVal = Array.isArray(newDisplayValue)
        ? newDisplayValue[0]
        : newDisplayValue;
      isDraggingRef.current = false;
      localDisplayValueRef.current = null;

      const actualValue = scale(displayVal);
      onChangeCommitted?.(actualValue);
    },
    [scale, onChangeCommitted]
  );

  // Handle numeric input change
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newActualValue = parseFloat(event.target.value);
      if (isNaN(newActualValue)) return;

      // Clamp to bounds
      const clampedValue = Math.min(Math.max(newActualValue, min), max);
      onChange?.(clampedValue);
    },
    [min, max, onChange]
  );

  // Handle input blur (commit)
  const handleInputBlur = useCallback(() => {
    onChangeCommitted?.(value);
  }, [value, onChangeCommitted]);

  // Handle input Enter key
  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        onChangeCommitted?.(value);
      }
    },
    [value, onChangeCommitted]
  );

  // Slider sx styles with optional gradient
  const sliderSx = useMemo(
    () => ({
      '& .MuiSlider-rail': {
        ...(trackGradient && {
          background: trackGradient,
          opacity: 1,
          height: 8,
          borderRadius: 4,
        }),
      },
      '& .MuiSlider-thumb': {
        backgroundColor: '#1976d2',
      },
      '& .MuiSlider-markLabel': {
        color: theme === 'dark' ? 'var(--text, #fff)' : 'var(--text, #000)',
      },
    }),
    [trackGradient, theme]
  );

  const inputElement = showInput && (
    <StyledInput
      value={Math.round(scale(displayValue))}
      size="small"
      onChange={handleInputChange}
      onBlur={handleInputBlur}
      onKeyDown={handleInputKeyDown}
      disabled={disabled}
      inputProps={{
        step,
        min,
        max,
        type: 'number',
        'aria-label': ariaLabel || label || 'Numeric input',
      }}
    />
  );

  const sliderElement = (
    <Slider
      value={displayValue}
      min={minDisplay}
      max={maxDisplay}
      step={step > 0 ? undefined : 1} // Let MUI handle steps in display space
      scale={scale}
      marks={marks}
      track={false}
      size="medium"
      onChange={handleSliderChange}
      onChangeCommitted={handleSliderChangeCommitted}
      disabled={disabled}
      aria-label={ariaLabel || label || 'Slider'}
      sx={sliderSx}
    />
  );

  return (
    <div
      className={`scaled-range-slider ${theme} ${className || ''}`}
      data-testid="scaled-range-slider"
    >
      <div className="scaled-range-slider__container">
        {inputPosition === 'start' && inputElement}
        {sliderElement}
        {inputPosition === 'end' && inputElement}
      </div>
    </div>
  );
};

export default ScaledRangeSlider;
