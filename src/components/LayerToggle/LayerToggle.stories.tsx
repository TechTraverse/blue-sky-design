import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { LayerToggle } from './LayerToggle';

const meta: Meta<typeof LayerToggle> = {
  title: 'Components/LayerToggle',
  component: LayerToggle,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
  argTypes: {
    onSelect: { action: 'selected' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 280 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LayerToggle>;

export const Default: Story = {
  args: {
    id: 'imagery',
    label: 'Satellite Imagery',
    selected: false,
  },
};

export const Selected: Story = {
  args: {
    id: 'imagery',
    label: 'Satellite Imagery',
    selected: true,
  },
};

export const WithDescription: Story = {
  args: {
    id: 'terrain',
    label: 'Terrain',
    description: 'Topographic map with elevation shading',
    selected: false,
  },
};

export const WithThumbnail: Story = {
  args: {
    id: 'imagery',
    label: 'Satellite Imagery',
    description: 'High-resolution satellite photos',
    thumbnail: 'https://placehold.co/96x64/1a1a2e/ffffff?text=Sat',
    selected: false,
  },
};

export const WithThumbnailSelected: Story = {
  args: {
    id: 'imagery',
    label: 'Satellite Imagery',
    description: 'High-resolution satellite photos',
    thumbnail: 'https://placehold.co/96x64/1a1a2e/ffffff?text=Sat',
    selected: true,
  },
};

/** Example of using multiple LayerToggles as a radio group */
export const RadioGroup: Story = {
  render: () => {
    const [selected, setSelected] = useState('imagery');

    const options = [
      { id: 'imagery', label: 'Satellite Imagery', description: 'High-resolution photos' },
      { id: 'terrain', label: 'Terrain', description: 'Elevation shading' },
      { id: 'streets', label: 'Streets', description: 'Road network' },
    ];

    return (
      <div role="radiogroup" aria-label="Basemap selection" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.map((opt) => (
          <LayerToggle
            key={opt.id}
            id={opt.id}
            label={opt.label}
            description={opt.description}
            selected={selected === opt.id}
            onSelect={setSelected}
          />
        ))}
      </div>
    );
  },
};
