import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { DynamicLegend } from './DynamicLegend';
import type { LegendEntry } from './types';

const meta = {
  title: 'Components/DynamicLegend',
  component: DynamicLegend,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    theme: {
      control: 'select',
      options: ['light', 'dark'],
    },
  },
} satisfies Meta<typeof DynamicLegend>;

export default meta;
type Story = StoryObj<typeof meta>;

const frpGradientEntry: LegendEntry = {
  id: 'frp-scene',
  label: 'Fire Radiative Power',
  visual: {
    type: 'gradient',
    colorStops: [
      { value: 0, color: 'rgba(255, 255, 0, 1)', label: '0' },
      { value: 10, color: 'rgba(255, 165, 0, 1)', label: '10' },
      { value: 100, color: 'rgba(255, 0, 0, 1)', label: '100' },
      { value: 1000, color: 'rgba(139, 0, 0, 1)', label: '1000' },
      { value: 2000, color: 'rgba(255, 0, 255, 1)', label: '2000' },
    ],
  },
};

const swatchEntry: LegendEntry = {
  id: 'nifc',
  label: 'NIFC Incidents',
  visual: { type: 'swatch', color: '#fcb103' },
};

const categoricalEntry: LegendEntry = {
  id: 'nws-fire-wx',
  label: 'NWS Fire Weather',
  visual: {
    type: 'gradient',
    colorStops: [
      { value: 0, color: 'rgba(230, 152, 0, 1)', label: 'Elevated' },
      { value: 1, color: 'rgba(255, 0, 0, 1)', label: 'Critical' },
      { value: 2, color: 'rgba(230, 0, 169, 1)', label: 'Extreme' },
    ],
  },
};

const thumbnailEntry: LegendEntry = {
  id: 'goes-fire-temp',
  label: 'GOES Fire Temperature',
  visual: {
    type: 'thumbnail',
    src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="20"><defs><linearGradient id="g"><stop offset="0%" stop-color="blue"/><stop offset="50%" stop-color="yellow"/><stop offset="100%" stop-color="red"/></linearGradient></defs><rect fill="url(%23g)" width="100" height="20"/></svg>',
    alt: 'Fire temperature raster',
  },
};

const iconEntry: LegendEntry = {
  id: 'map-icon',
  label: 'Fire Locations',
  visual: {
    type: 'icon',
    src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ff6600"><circle cx="12" cy="12" r="8"/></svg>',
    color: '#ff6600',
  },
};

const allEntries: LegendEntry[] = [
  frpGradientEntry,
  categoricalEntry,
  swatchEntry,
  thumbnailEntry,
  iconEntry,
];

const CollapsibleWrapper = ({ entries, ...props }: { entries: LegendEntry[]; theme?: 'light' | 'dark' }) => {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div style={{ padding: 20, background: props.theme === 'dark' ? '#1a1a1a' : '#ddd', width: 320 }}>
      <DynamicLegend
        entries={entries}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        {...props}
      />
    </div>
  );
};

/** All visual types in one legend */
export const AllTypes: Story = {
  args: {
    entries: allEntries,
    title: 'Legend',
  },
  render: (args) => <CollapsibleWrapper {...args} />,
};

/** Gradient entries only (fire-related layers) */
export const GradientsOnly: Story = {
  args: {
    entries: [frpGradientEntry, categoricalEntry],
    title: 'Active Layers',
  },
  render: (args) => <CollapsibleWrapper {...args} />,
};

/** Single swatch entry */
export const SingleSwatch: Story = {
  args: {
    entries: [swatchEntry],
  },
  render: (args) => <CollapsibleWrapper {...args} />,
};

/** Dark theme */
export const DarkTheme: Story = {
  args: {
    entries: allEntries,
    theme: 'dark',
  },
  render: (args) => <CollapsibleWrapper {...args} />,
};

/** With disabled entry */
export const WithDisabled: Story = {
  args: {
    entries: [
      frpGradientEntry,
      { ...swatchEntry, disabled: true },
      categoricalEntry,
    ],
  },
  render: (args) => <CollapsibleWrapper {...args} />,
};
