import type { Meta, StoryObj } from '@storybook/react-vite';

import { TimeRangeSlider } from './TimeRangeSlider';
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
