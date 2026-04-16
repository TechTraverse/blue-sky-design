import type { Meta, StoryObj } from '@storybook/react-vite';
import { LayerRow } from './LayerRow';

const meta: Meta<typeof LayerRow> = {
  title: 'Components/LayerRow',
  component: LayerRow,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 320, background: 'white', padding: 8, borderRadius: 4 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LayerRow>;

export const Default: Story = {
  args: {
    label: 'GOES-East CONUS GeoColor',
  },
};

export const WithImageIcon: Story = {
  args: {
    icon: 'https://placehold.co/64x64/2d5a27/ffffff?text=GC',
    label: 'GOES-East CONUS GeoColor',
  },
};

export const WithDescription: Story = {
  args: {
    icon: 'https://placehold.co/64x64/1a2a4e/ffffff?text=FT',
    label: 'Fire Temperature',
    description: 'GOES-East CONUS Fire Temperature',
  },
};

export const Truncated: Story = {
  args: {
    icon: 'https://placehold.co/64x64/4a2a4e/ffffff?text=MP',
    label: 'GOES-East CONUS Microphysics with a very long name that should truncate',
    description: 'This is a very long description that should also be truncated when it overflows',
    textOverflow: 'truncate',
  },
};

export const WithTrailingContent: Story = {
  args: {
    icon: 'https://placehold.co/64x64/4e3a1a/ffffff?text=DF',
    label: 'GOES-East CONUS DayFire',
    children: (
      <input type="checkbox" style={{ width: 20, height: 20 }} />
    ),
  },
};
