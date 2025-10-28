import type { Meta, StoryObj } from '@storybook/react-vite';

import { TimeRangeSlider } from './TimeRangeSlider';
import { Theme, TimeZone } from './timeSliderTypes';

const meta = {
  component: TimeRangeSlider,
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
    onTimeZoneChange: (timeZone) => {
      console.log('Timezone changed to:', timeZone);
    },
    theme: Theme.Dark,
    timeZone: TimeZone.Local,
    hideAnimationToggle: true
  }
};

export const UTCTimeZone: Story = {
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
    onTimeZoneChange: (timeZone) => {
      console.log('Timezone changed to:', timeZone);
    },
    theme: Theme.Light,
    timeZone: TimeZone.UTC
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
    onTimeZoneChange: (timeZone) => {
      console.log('Timezone changed to:', timeZone);
    },
    theme: Theme.Light,
    timeZone: TimeZone.Local,
    hideAnimationToggle: true
  }
};
