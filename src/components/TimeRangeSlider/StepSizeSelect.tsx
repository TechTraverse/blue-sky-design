import "./stepSizeSelect.css";
import { useId, useRef } from "react";

const UNITS = [
  { ms: 60 * 60 * 1000, short: 'h', long: 'hour' },
  { ms: 60 * 1000, short: 'm', long: 'minute' },
  { ms: 1000, short: 's', long: 'second' },
  { ms: 1, short: 'ms', long: 'millisecond' },
];

/** The largest unit that divides the step evenly, e.g. 300000 → 5 minutes. */
const toUnit = (stepMs: number) => {
  const unit = UNITS.find((u) => stepMs % u.ms === 0) ?? UNITS[UNITS.length - 1];
  return { count: stepMs / unit.ms, unit };
};

/** "5m", "1h", "30s". */
const formatStepLabel = (stepMs: number): string => {
  const { count, unit } = toUnit(stepMs);
  return `${count}${unit.short}`;
};

/** "5 minutes", "1 hour", for the accessible name. */
const formatStepName = (stepMs: number): string => {
  const { count, unit } = toUnit(stepMs);
  return `${count} ${unit.long}${count === 1 ? '' : 's'}`;
};

/**
 * Segmented control for instant mode's step size. A radio group: one choice is
 * always selected, Tab enters on it, and the arrow keys move and select.
 */
export const StepSizeSelect = ({
  options,
  value,
  onChange,
}: {
  options: readonly number[];
  value: number;
  onChange: (stepMs: number) => void;
}) => {
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const labelId = useId();

  const select = (index: number) => {
    const wrapped = (index + options.length) % options.length;
    buttonsRef.current[wrapped]?.focus();
    if (options[wrapped] !== value) onChange(options[wrapped]);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const target = {
      ArrowRight: index + 1,
      ArrowDown: index + 1,
      ArrowLeft: index - 1,
      ArrowUp: index - 1,
      Home: 0,
      End: options.length - 1,
    }[e.key];
    if (target === undefined) return;
    e.preventDefault();
    select(target);
  };

  return (
    <div className="step-size-select">
      <span className="step-size-select-label" id={labelId}>Step</span>
      <div role="radiogroup" aria-labelledby={labelId} className="step-size-select-group">
        {options.map((stepMs, i) => {
          const checked = stepMs === value;
          return (
            <button
              key={stepMs}
              ref={(el) => { buttonsRef.current[i] = el; }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={formatStepName(stepMs)}
              title={`Step ${formatStepName(stepMs)}`}
              tabIndex={checked ? 0 : -1}
              className={`step-size-select-option${checked ? ' selected' : ''}`}
              onClick={() => select(i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
            >
              {formatStepLabel(stepMs)}
            </button>
          );
        })}
      </div>
    </div>
  );
};
