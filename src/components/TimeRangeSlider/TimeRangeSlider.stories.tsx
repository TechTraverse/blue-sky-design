import type { Meta, StoryObj } from '@storybook/react-vite';

import { TimeRangeSlider } from './TimeRangeSlider';

const meta = {
  component: TimeRangeSlider,
} satisfies Meta<typeof TimeRangeSlider>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    user: {},
    initialStartDate: 1752991200000,
    initialEndDate: 1753164000000
  }
};