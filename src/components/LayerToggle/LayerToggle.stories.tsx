import type { Meta, StoryObj } from '@storybook/react-vite';
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
      <div style={{ width: 320 }}>
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
    thumbnail: 'https://placehold.co/64x64/1a1a2e/ffffff?text=Sat',
    selected: false,
  },
};

export const WithThumbnailSelected: Story = {
  args: {
    id: 'imagery',
    label: 'Satellite Imagery',
    description: 'High-resolution satellite photos',
    thumbnail: 'https://placehold.co/64x64/1a1a2e/ffffff?text=Sat',
    selected: true,
  },
};

/** Multiple LayerToggles as a radio group — selection does not reorder items */
export const RadioGroup: Story = {
  render: () => {
    const [selected, setSelected] = useState('band13');

    const options = [
      { id: 'band13', label: 'Band 13 (LWIR)', description: 'GOES-East CONUS Band 13' },
      { id: 'geocolor', label: 'GeoColor', description: 'GOES-East CONUS GeoColor' },
      { id: 'fire-temp', label: 'Fire Temperature', description: 'GOES-East CONUS Fire Temperature' },
      { id: 'microphysics', label: 'Microphysics', description: 'GOES-East CONUS Microphysics' },
      { id: 'dayfire', label: 'DayFire', description: 'GOES-East CONUS DayFire' },
      { id: 'band02', label: 'Band 2 (Visible)', description: 'GOES-East CONUS Band 02' },
      { id: 'band07', label: 'Band 7 (SWIR)', description: 'GOES-East CONUS Band 07' },
      { id: 'volcat-ash', label: 'VOLCAT Ash', description: 'GOES-East CONUS VOLCAT Ash' },
    ];

    return (
      <div role="radiogroup" aria-label="Layer selection" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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

/** Radio group with thumbnails */
export const RadioGroupWithThumbnails: Story = {
  render: () => {
    const [selected, setSelected] = useState('geocolor');

    const options = [
      { id: 'geocolor', label: 'GOES-East CONUS GeoColor', thumbnail: 'https://placehold.co/64x64/2d5a27/ffffff?text=GC' },
      { id: 'fire-temp', label: 'GOES-East CONUS Fire Temperature', thumbnail: 'https://placehold.co/64x64/1a2a4e/ffffff?text=FT' },
      { id: 'microphysics', label: 'GOES-East CONUS Microphysics', thumbnail: 'https://placehold.co/64x64/4a2a4e/ffffff?text=MP' },
      { id: 'dayfire', label: 'GOES-East CONUS DayFire', thumbnail: 'https://placehold.co/64x64/4e3a1a/ffffff?text=DF' },
    ];

    return (
      <div role="radiogroup" aria-label="Layer selection" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {options.map((opt) => (
          <LayerToggle
            key={opt.id}
            id={opt.id}
            label={opt.label}
            thumbnail={opt.thumbnail}
            selected={selected === opt.id}
            onSelect={setSelected}
          />
        ))}
      </div>
    );
  },
};
