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
    hideAnimationToggle: true
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
