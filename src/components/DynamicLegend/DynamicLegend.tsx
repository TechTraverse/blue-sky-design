import { IoChevronDown, IoChevronUp } from 'react-icons/io5';
import type { DynamicLegendProps } from './types';
import { LegendEntryRow } from './LegendEntryRow';
import './DynamicLegend.css';

export const DynamicLegend = ({
  entries,
  children,
  collapsed = false,
  onToggleCollapse,
  title = 'Legend',
  className = '',
  theme,
}: DynamicLegendProps) => {
  const hasContent = children || (entries && entries.length > 0);
  if (!hasContent) return null;

  const themeClass = theme ? `legend-${theme}` : '';

  return (
    <div className={`dynamicLegend ${themeClass} ${className}`}>
      <button
        className="legendHeader"
        onClick={onToggleCollapse}
        aria-expanded={!collapsed}
        type="button"
      >
        <span className="legendTitle">{title}</span>
        {onToggleCollapse && (
          <span className="legendToggle">
            {collapsed ? <IoChevronUp /> : <IoChevronDown />}
          </span>
        )}
      </button>
      {!collapsed && (
        <div className="legendBody">
          {children
            ? children
            : entries?.map((entry) => (
                <LegendEntryRow key={entry.id} entry={entry} />
              ))}
        </div>
      )}
    </div>
  );
};
