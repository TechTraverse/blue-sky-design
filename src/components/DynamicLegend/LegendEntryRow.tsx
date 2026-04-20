import type { LegendEntry } from './types';
import { GradientBar } from './GradientBar';

export interface LegendEntryRowProps {
  entry: LegendEntry;
}

const VisualRenderer = ({ entry }: { entry: LegendEntry }) => {
  const { visual } = entry;

  switch (visual.type) {
    case 'gradient':
      return (
        <GradientBar
          colorStops={visual.colorStops}
          discrete={visual.discrete}
        />
      );

    case 'swatch':
      return (
        <div
          className="legendSwatch"
          style={{ backgroundColor: visual.color }}
        />
      );

    case 'thumbnail':
      return (
        <img
          className="legendThumbnail"
          src={visual.src}
          alt={visual.alt ?? entry.label}
        />
      );

    case 'icon':
      return (
        <img
          className="legendIcon"
          src={visual.src}
          alt={entry.label}
          style={visual.color ? { filter: `drop-shadow(0 0 0 ${visual.color})` } : undefined}
        />
      );

    default:
      return null;
  }
};

export const LegendEntryRow = ({ entry }: LegendEntryRowProps) => {
  const disabledClass = entry.disabled ? 'legendEntryDisabled' : '';

  return (
    <div className={`legendEntry ${disabledClass}`}>
      <span className="legendEntryLabel">{entry.label}</span>
      <div className="legendEntryVisual">
        <VisualRenderer entry={entry} />
      </div>
    </div>
  );
};
