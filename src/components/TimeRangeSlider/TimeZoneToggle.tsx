import { useTimeZoneDisplay } from '../../contexts/TimeZoneDisplayContext';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { TimeZone } from './timeSliderTypes';

export function TimeZoneToggle() {
  const { mode, setMode } = useTimeZoneDisplay();
  
  return (
    <ToggleButtonGroup
      value={mode}
      exclusive
      onChange={(_, newMode) => newMode && setMode(newMode)}
      size="small"
      className="calendar-timezone-toggle"
      aria-label="Timezone display mode"
    >
      <ToggleButton value={TimeZone.Local} aria-label="Show times in local timezone">
        Local
      </ToggleButton>
      <ToggleButton value={TimeZone.UTC} aria-label="Show times in UTC timezone">
        UTC
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
