import type { Meta, StoryObj } from '@storybook/react-vite';

import { TimeRangeSlider } from './TimeRangeSlider';

const meta = {
  component: TimeRangeSlider,
} satisfies Meta<typeof TimeRangeSlider>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    dateRange: {
      start: new Date(1752991200000),
      end: new Date(1752991200000 + 3600000) // 1 hour later
    },
    onDateRangeSelect: ({ start, end }) => {
      console.log('Selected date range:', start, 'to', end);
    }
  }
};
