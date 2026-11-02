import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import type { RangeValue } from '@react-types/shared';

import { TimeRangeSlider } from './TimeRangeSlider';
import type { TimeRangeSliderProps } from './TimeRangeSlider';
import { Theme } from './timeSliderTypes';
import { TimeZoneDisplayProvider } from '../../contexts/TimeZoneDisplayContext';

const meta = {
  component: TimeRangeSlider,
  decorators: [
    (Story) => (
      <TimeZoneDisplayProvider>
        <Story />
      </TimeZoneDisplayProvider>
    ),
  ],
} satisfies Meta<typeof TimeRangeSlider>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    dateRange: {
      start: new Date(1752991200000),
      end: new Date(1752991500000)
    },
    dateRangeForReset: {
      start: new Date(1752991200000),
      end: new Date(1752991500000)
    },
    onDateRangeSelect: ({ start, end }) => {
      console.log('Selected date range:', start, 'to', end);
    },
    theme: Theme.Dark,
    hideAnimationToggle: false
  }
};

export const LightTheme: Story = {
  args: {
    dateRange: {
      start: new Date(1752991200000),
      end: new Date(1752991500000)
    },
    dateRangeForReset: {
      start: new Date(1752991200000),
      end: new Date(1752991500000)
    },
    onDateRangeSelect: ({ start, end }) => {
      console.log('Selected date range:', start, 'to', end);
    },
    theme: Theme.Light
  }
};

export const HiddenAnimationToggle: Story = {
  args: {
    dateRange: {
      start: new Date(1752991200000),
      end: new Date(1752991500000)
    },
    dateRangeForReset: {
      start: new Date(1752991200000),
      end: new Date(1752991500000)
    },
    onDateRangeSelect: ({ start, end }) => {
      console.log('Selected date range:', start, 'to', end);
    },
    theme: Theme.Light,
    hideAnimationToggle: true
  }
};

export const WithAsyncLatestDateCallback: Story = {
  args: {
    dateRange: {
      start: new Date(1752991200000),
      end: new Date(1752991500000)
    },
    onDateRangeSelect: ({ start, end }) => {
      console.log('Selected date range:', start, 'to', end);
    },
    getLatestDateRange: async () => {
      console.log('Fetching latest date...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      const latestDate = new Date(1752991200000 + (2 * 60 * 60 * 1000));
      console.log('Latest date fetched:', latestDate);
      return latestDate;
    },
    theme: Theme.Dark
  }
};

export const WithAsyncLatestDateCallbackAndFallback: Story = {
  args: {
    dateRange: {
      start: new Date(1752991200000),
      end: new Date(1752991500000)
    },
    dateRangeForReset: {
      start: new Date(1752991200000 + (1 * 60 * 60 * 1000)),
      end: new Date(1752991500000 + (1 * 60 * 60 * 1000))
    },
    onDateRangeSelect: ({ start, end }) => {
      console.log('Selected date range:', start, 'to', end);
    },
    getLatestDateRange: async () => {
      console.log('Attempting to fetch latest date...');
      await new Promise(resolve => setTimeout(resolve, 500));
      throw new Error('Simulated network error');
    },
    theme: Theme.Light
  }
};

export const WithSlowAsyncCallback: Story = {
  args: {
    dateRange: {
      start: new Date(1752991200000),
      end: new Date(1752991500000)
    },
    onDateRangeSelect: ({ start, end }) => {
      console.log('Selected date range:', start, 'to', end);
    },
    getLatestDateRange: async () => {
      console.log('Fetching latest date (slow)...');
      // Simulate a slow network request
      await new Promise(resolve => setTimeout(resolve, 3000));
      const latestDate = new Date();
      console.log('Latest date fetched after delay:', latestDate);
      return latestDate;
    },
    theme: Theme.Dark
  }
};

export const DisabledAnimationToggle: Story = {
  args: {
    dateRange: {
      start: new Date(1752991200000),
      end: new Date(1752991500000)
    },
    dateRangeForReset: {
      start: new Date(1752991200000),
      end: new Date(1752991500000)
    },
    onDateRangeSelect: ({ start, end }) => {
      console.log('Selected date range:', start, 'to', end);
    },
    theme: Theme.Light,
    disabledAnimationTooltip: 'Animation is unavailable while data is loading'
  }
};

export const DisabledAnimationToggleDark: Story = {
  args: {
    dateRange: {
      start: new Date(1752991200000),
      end: new Date(1752991500000)
    },
    dateRangeForReset: {
      start: new Date(1752991200000),
      end: new Date(1752991500000)
    },
    onDateRangeSelect: ({ start, end }) => {
      console.log('Selected date range:', start, 'to', end);
    },
    theme: Theme.Dark,
    disabledAnimationTooltip: 'Animation requires at least 2 hours of data'
  }
};

/**
 * Demonstrates using availableDateRange to constrain the selectable date range
 * to a 24-hour window. The earliest allowed date is 24 hours before the current time,
 * and the latest allowed date is the current time.
 */
export const Constrained24hWindow: Story = {
  args: {
    dateRange: {
      // Selection starts 2 hours before current time, 5 minute duration
      start: new Date(1752991200000 - (2 * 60 * 60 * 1000)),
      end: new Date(1752991200000 - (2 * 60 * 60 * 1000) + (5 * 60 * 1000))
    },
    availableDateRange: {
      // Available range: 24 hours before current time to current time
      start: new Date(1752991200000 - (24 * 60 * 60 * 1000)),
      end: new Date(1752991200000)
    },
    onDateRangeSelect: ({ start, end }) => {
      console.log('Selected date range:', start, 'to', end);
    },
    theme: Theme.Dark,
    hideAnimationToggle: false
  }
};

export const Constrained24hWindowLightTheme: Story = {
  args: {
    dateRange: {
      start: new Date(1752991200000 - (2 * 60 * 60 * 1000)),
      end: new Date(1752991200000 - (2 * 60 * 60 * 1000) + (5 * 60 * 1000))
    },
    availableDateRange: {
      start: new Date(1752991200000 - (24 * 60 * 60 * 1000)),
      end: new Date(1752991200000)
    },
    onDateRangeSelect: ({ start, end }) => {
      console.log('Selected date range:', start, 'to', end);
    },
    theme: Theme.Light
  }
};

/**
 * Demonstrates a narrow 4-hour available window to show both left and right
 * disabled regions clearly visible in the default view.
 */
export const Constrained4hWindowNarrow: Story = {
  args: {
    dateRange: {
      start: new Date(1752991200000 - (2 * 60 * 60 * 1000)),
      end: new Date(1752991200000 - (2 * 60 * 60 * 1000) + (5 * 60 * 1000))
    },
    availableDateRange: {
      // Narrow 4-hour window
      start: new Date(1752991200000 - (4 * 60 * 60 * 1000)),
      end: new Date(1752991200000)
    },
    onDateRangeSelect: ({ start, end }) => {
      console.log('Selected date range:', start, 'to', end);
    },
    theme: Theme.Dark
  }
};

/**
 * Demonstrates hiding the date picker when using a constrained window.
 * Useful when the available range is narrow and the calendar picker adds no value.
 */
export const Constrained24hWindowNoDatePicker: Story = {
  args: {
    dateRange: {
      start: new Date(1752991200000 - (2 * 60 * 60 * 1000)),
      end: new Date(1752991200000 - (2 * 60 * 60 * 1000) + (5 * 60 * 1000))
    },
    availableDateRange: {
      start: new Date(1752991200000 - (24 * 60 * 60 * 1000)),
      end: new Date(1752991200000)
    },
    hideDatePicker: true,
    onDateRangeSelect: ({ start, end }) => {
      console.log('Selected date range:', start, 'to', end);
    },
    theme: Theme.Dark
  }
};

/**
 * Instant mode: one selected instant on a clock grid. The step selector on the
 * bar picks the grid (1, 5, 10 or 30 minutes); the track has a single thumb,
 * and drags, clicks, steps, picks and playback all land on grid points inside
 * the 24-hour window. Every selection is reported with end === start. The step
 * is left uncontrolled here, so the slider keeps the one the user picks.
 */
export const InstantMode: Story = {
  args: {
    selectionMode: 'instant',
    dateRange: {
      start: new Date(1752991200000 - (2 * 60 * 60 * 1000)),
      end: new Date(1752991200000 - (2 * 60 * 60 * 1000))
    },
    availableDateRange: {
      start: new Date(1752991200000 - (24 * 60 * 60 * 1000)),
      end: new Date(1752991200000)
    },
    onDateRangeSelect: ({ start, end }, source) => {
      console.log('Selected instant:', start, 'end === start:', start.getTime() === end.getTime(), source);
    },
    onStepMsChange: (stepMs) => {
      console.log('Step size:', stepMs / 60000, 'min');
    },
    getLatestDateRange: async () => new Date(1752991200000 - (3 * 60 * 1000) + 31 * 1000),
    pollingInterval: 0,
    theme: Theme.Dark
  }
};

/** Holds the instant and the step the way a consuming app does, and echoes both back. */
const ControlledInstantSlider = (args: TimeRangeSliderProps) => {
  const [instant, setInstant] = useState<RangeValue<Date>>(args.dateRange!);
  const [stepMs, setStepMs] = useState(args.stepMs ?? 5 * 60 * 1000);
  return (
    <TimeRangeSlider
      {...args}
      dateRange={instant}
      stepMs={stepMs}
      onStepMsChange={(next) => {
        setStepMs(next);
        args.onStepMsChange?.(next);
      }}
      onDateRangeSelect={(rv, source) => {
        setInstant(rv);
        args.onDateRangeSelect(rv, source);
      }}
    />
  );
};

/**
 * Instant mode with the instant and step size controlled by the consumer, and
 * no date picker, as in a simplified view: the step selector stays on the bar.
 * Steps are 10 minutes, with a 15-minute option added.
 */
export const InstantModeControlled: Story = {
  args: {
    selectionMode: 'instant',
    stepMs: 10 * 60 * 1000,
    stepOptionsMs: [5, 10, 15, 30].map((m) => m * 60 * 1000),
    dateRange: {
      start: new Date(1752991200000 - (60 * 60 * 1000)),
      end: new Date(1752991200000 - (60 * 60 * 1000))
    },
    availableDateRange: {
      start: new Date(1752991200000 - (24 * 60 * 60 * 1000)),
      end: new Date(1752991200000)
    },
    hideDatePicker: true,
    onDateRangeSelect: ({ start }, source) => {
      console.log('Selected instant:', start, source);
    },
    theme: Theme.Light
  },
  render: (args) => <ControlledInstantSlider {...args} />
};
