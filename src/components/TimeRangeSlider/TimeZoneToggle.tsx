import { useTimeZoneDisplay } from '../../contexts/TimeZoneDisplayContext';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';

export function TimeZoneToggle() {
  const { mode, setMode, getDisplayZone } = useTimeZoneDisplay();
  
  return (
    <ToggleButtonGroup
      value={mode}
      exclusive
      onChange={(_, newMode) => newMode && setMode(newMode)}
      size="small"
      className="calendar-timezone-toggle"
      aria-label="Timezone display mode"
    >
      <ToggleButton value="local" aria-label="Show times in local timezone">
        Local
      </ToggleButton>
      <ToggleButton value="utc" aria-label="Show times in UTC timezone">
        UTC
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
