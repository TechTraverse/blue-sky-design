/**
 * DurationSlider - A slider for selecting time durations
 *
 * Wraps ScaledRangeSlider with duration-specific parsing, formatting,
 * and a custom text input that accepts human-readable duration strings.
 *
 * Key features:
 * - Parses inputs like "5m", "1h30m", "1.5h"
 * - Formats values as readable durations
 * - Non-linear scales for wide time ranges
 * - Preset ranges for common use cases
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { Input, styled } from '@mui/material';
import { ScaledRangeSlider } from '../ScaledRangeSlider';
import type { SliderMark } from '../ScaledRangeSlider';
import type { DurationSliderProps } from './types';
import {
  parseDuration,
  formatDuration,
  getRangeFromPreset,
  generateDurationMarks,
  convertMarksToMs,
  getRecommendedScale,
} from './durationUtils';
import './DurationSlider.css';

const StyledInput = styled(Input)`
  width: 100px;
`;

export const DurationSlider: React.FC<DurationSliderProps> = ({
  value,
  min: minProp,
  max: maxProp,
  rangePreset,
  scale: scaleProp,
  onChange,
  onChangeCommitted,
  marks: marksProp,
  showInput = true,
  inputPosition = 'start',
  label,
  'aria-label': ariaLabel,
  disabled = false,
  className,
  theme = 'dark',
  defaultUnit = 's',
  minDisplayUnit = 's',
}) => {
  // Resolve range from preset or props
  const { min, max } = useMemo(() => {
    if (rangePreset) {
      return getRangeFromPreset(rangePreset);
    }
    return {
      min: minProp ?? 0,
      max: maxProp ?? 3600000, // 1 hour default
    };
  }, [rangePreset, minProp, maxProp]);

  // Auto-select scale if not specified
  const scale = useMemo(
    () => scaleProp ?? getRecommendedScale(min, max),
    [scaleProp, min, max]
  );

  // Convert duration marks to slider marks (milliseconds)
  const marks = useMemo((): SliderMark[] | undefined => {
    if (!marksProp) return undefined;

    if (marksProp === 'auto') {
      const autoMarks = generateDurationMarks(min, max, 5);
      return convertMarksToMs(autoMarks, defaultUnit);
    }

    return convertMarksToMs(marksProp, defaultUnit);
  }, [marksProp, min, max, defaultUnit]);

  // Track editing state for the input
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Formatted display value
  const displayValue = useMemo(
    () => formatDuration(value, { minUnit: minDisplayUnit }),
    [value, minDisplayUnit]
  );

  // Handle input focus - switch to editing mode
  const handleInputFocus = useCallback(() => {
    setIsEditing(true);
    setInputValue(displayValue);
  }, [displayValue]);

  // Handle input change - update local state
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;
      setInputValue(newValue);

      // Try to parse and emit onChange for live preview
      const parsed = parseDuration(newValue, defaultUnit);
      if (parsed !== null) {
        const clamped = Math.min(Math.max(parsed, min), max);
        onChange?.(clamped);
      }
    },
    [defaultUnit, min, max, onChange]
  );

  // Handle input blur - commit value
  const handleInputBlur = useCallback(() => {
    setIsEditing(false);

    const parsed = parseDuration(inputValue, defaultUnit);
    if (parsed !== null) {
      const clamped = Math.min(Math.max(parsed, min), max);
      onChangeCommitted?.(clamped);
    } else {
      // Invalid input - emit current value to trigger re-render with original
      onChangeCommitted?.(value);
    }
  }, [inputValue, defaultUnit, min, max, value, onChangeCommitted]);

  // Handle Enter key - commit value
  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        inputRef.current?.blur();
      } else if (event.key === 'Escape') {
        setIsEditing(false);
        setInputValue('');
        inputRef.current?.blur();
      }
    },
    []
  );

  // Handle slider onChange
  const handleSliderChange = useCallback(
    (newValue: number) => {
      onChange?.(newValue);
    },
    [onChange]
  );

  // Handle slider commit
  const handleSliderCommit = useCallback(
    (newValue: number) => {
      onChangeCommitted?.(newValue);
    },
    [onChangeCommitted]
  );

  const inputElement = showInput && (
    <StyledInput
      inputRef={inputRef}
      value={isEditing ? inputValue : displayValue}
      size="small"
      onFocus={handleInputFocus}
      onChange={handleInputChange}
      onBlur={handleInputBlur}
      onKeyDown={handleInputKeyDown}
      disabled={disabled}
      inputProps={{
        'aria-label': ariaLabel || label || 'Duration input',
      }}
    />
  );

  return (
    <div
      className={`duration-slider ${theme} ${className || ''}`}
      data-testid="duration-slider"
    >
      <div className="duration-slider__container">
        {inputPosition === 'start' && inputElement}
        <ScaledRangeSlider
          value={value}
          min={min}
          max={max}
          scale={scale}
          onChange={handleSliderChange}
          onChangeCommitted={handleSliderCommit}
          marks={marks}
          showInput={false}
          disabled={disabled}
          label={label}
          aria-label={ariaLabel}
          theme={theme}
          className="duration-slider__slider"
        />
        {inputPosition === 'end' && inputElement}
      </div>
    </div>
  );
};

export default DurationSlider;
