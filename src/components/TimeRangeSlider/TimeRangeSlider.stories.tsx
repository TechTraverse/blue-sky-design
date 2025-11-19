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
