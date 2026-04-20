import type { ColorStop } from './types';
import { colorStopsToSimpleGradient } from '../ScaledRangeSlider/colorUtils';

export interface GradientBarProps {
  colorStops: ColorStop[];
  /** Hard-edged blocks (true) or smooth gradient (false). Default: true */
  discrete?: boolean;
  className?: string;
}

const buildSmoothGradient = (colorStops: ColorStop[]): string => {
  if (colorStops.length === 0) return 'transparent';
  const sorted = [...colorStops].sort((a, b) => a.value - b.value);
  const min = sorted[0].value;
  const max = sorted[sorted.length - 1].value;
  const range = max - min || 1;
  const stops = sorted.map(
    (s) => `${s.color} ${((s.value - min) / range) * 100}%`
  );
  return `linear-gradient(to right, ${stops.join(', ')})`;
};

export const GradientBar = ({
  colorStops,
  discrete = true,
  className = '',
}: GradientBarProps) => {
  if (colorStops.length === 0) return null;

  const sorted = [...colorStops].sort((a, b) => a.value - b.value);
  const gradient = discrete
    ? colorStopsToSimpleGradient(sorted)
    : buildSmoothGradient(sorted);

  const showLabels = sorted.length <= 8;

  return (
    <div className={`legendGradientBar ${className}`}>
      <div
        className="legendGradientTrack"
        style={{ background: gradient }}
      />
      {showLabels && (
        <div className="legendGradientLabels">
          {sorted.map((stop, i) => {
            const label = stop.label ?? stop.value;
            const displayLabel =
              typeof label === 'string' && label.length > 8
                ? label.slice(0, 7) + '\u2026'
                : label;
            return (
              <span key={i} className="legendGradientLabel" title={String(label)}>
                {displayLabel}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};
