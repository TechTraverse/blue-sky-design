import type { Meta, StoryObj } from '@storybook/react';
import { LayerControl } from './LayerControl';
import { LayerItem } from './types';

// Mock layer icon component with different types
const MockLayerIcon = ({ layer }: { layer: LayerItem }) => {
  // Simulate different icon types based on layer ID
  if (layer.id.includes('satellite') || layer.id.includes('imagery')) {
    return (
      <img 
        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%234CAF50'/%3E%3Ctext x='16' y='20' text-anchor='middle' fill='white' font-size='14' font-weight='bold'%3ES%3C/text%3E%3C/svg%3E"
        alt={layer.name}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    );
  }
  
  if (layer.id.includes('temperature') || layer.id.includes('fire')) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%',
        background: 'linear-gradient(45deg, #FF5722, #FFC107)',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        🔥
      </div>
    );
  }
  
  if (layer.id.includes('water') || layer.id.includes('hydrology')) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%',
        background: 'linear-gradient(45deg, #2196F3, #00BCD4)',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        💧
      </div>
    );
  }
  
  // Default colored square with letter
  return (
    <div style={{ 
      width: '100%', 
      height: '100%',
      backgroundColor: layer.id.includes('raster') ? '#4CAF50' : '#2196F3',
      borderRadius: 4,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '12px',
      fontWeight: 'bold'
    }}>
      {layer.name.charAt(0).toUpperCase()}
    </div>
  );
};

const meta: Meta<typeof LayerControl> = {
  title: 'Components/LayerControl',
  component: LayerControl,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A reusable layer control component that manages enabled and disabled layers with drag-and-drop reordering, grouping, and download functionality.'
      }
    }
  },
  argTypes: {
    onLayerToggle: { action: 'layer toggled' },
    onLayerReorder: { action: 'layer reordered' },
    onLayerDownload: { action: 'layer downloaded' },
    groupBy: {
      control: 'select',
      options: ['none', 'domain', 'type'],
      mapping: {
        none: undefined,
        domain: (layer: LayerItem) => layer.tags?.has('weather') ? 'Weather' : layer.tags?.has('satellite') ? 'Satellite' : 'Other',
        type: (layer: LayerItem) => layer.id.includes('raster') ? 'Raster' : 'Vector'
      }
    }
  },
  decorators: [
    (Story) => (
      <div style={{ 
        width: 400, 
        height: 600, 
        border: '1px solid #ccc', 
        borderRadius: 4,
        backgroundColor: '#f5f5f5',
        padding: '8px'
      }}>
        <style>{`
          .layer-control .layerWrapper {
            background-color: white !important;
            border: 1px solid #e0e0e0 !important;
            border-radius: 4px !important;
            margin: 2px 0 !important;
          }
          .layer-control .MuiListSubheader-root {
            background-color: #f8f9fa !important;
            color: #666 !important;
            font-weight: 500 !important;
            border-radius: 4px !important;
            margin-bottom: 4px !important;
          }
          .layer-control .MuiAccordionSummary-root {
            background-color: #f8f9fa !important;
            border-radius: 4px !important;
          }
        `}</style>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Sample data
const sampleEnabledLayers: LayerItem[] = [
  {
    id: 'layer-1',
    name: 'Temperature Map',
    enabled: true,
    downloadable: true,
    tags: new Set(['weather', 'temperature'])
  },
  {
    id: 'layer-2', 
    name: 'Precipitation Data',
    enabled: true,
    downloadable: true,
    tags: new Set(['weather', 'precipitation'])
  },
  {
    id: 'layer-3',
    name: 'Road Network',
    enabled: true,
    downloadable: false,
    tags: new Set(['infrastructure'])
  }
];

const sampleDisabledLayers: LayerItem[] = [
  {
    id: 'raster-1',
    name: 'Satellite Imagery',
    enabled: false,
    downloadable: true,
    tags: new Set(['satellite', 'imagery'])
  },
  {
    id: 'raster-2',
    name: 'Elevation Model',
    enabled: false,
    downloadable: true,
    tags: new Set(['terrain', 'elevation'])
  },
  {
    id: 'vector-1',
    name: 'County Boundaries',
    enabled: false,
    downloadable: true,
    tags: new Set(['boundaries', 'administrative'])
  },
  {
    id: 'vector-2',
    name: 'Water Bodies',
    enabled: false,
    downloadable: false,
    tags: new Set(['hydrology', 'water'])
  },
  {
    id: 'weather-1',
    name: 'Wind Speed',
    enabled: false,
    downloadable: true,
    tags: new Set(['weather', 'wind'])
  },
  {
    id: 'weather-2',
    name: 'Humidity Levels',
    enabled: false,
    downloadable: true,
    tags: new Set(['weather', 'humidity'])
  }
];

export const Default: Story = {
  args: {
    enabledLayers: sampleEnabledLayers,
    disabledLayers: sampleDisabledLayers,
    renderLayerIcon: (layer) => <MockLayerIcon layer={layer} />
  }
};

export const WithGrouping: Story = {
  args: {
    enabledLayers: sampleEnabledLayers,
    disabledLayers: sampleDisabledLayers,
    renderLayerIcon: (layer) => <MockLayerIcon layer={layer} />,
    groupBy: (layer: LayerItem) => {
      if (layer.tags?.has('weather')) return 'Weather';
      if (layer.tags?.has('satellite')) return 'Satellite';
      if (layer.tags?.has('infrastructure')) return 'Infrastructure';
      if (layer.tags?.has('boundaries')) return 'Boundaries';
      if (layer.tags?.has('hydrology')) return 'Hydrology';
      if (layer.tags?.has('terrain')) return 'Terrain';
      return 'Other';
    }
  }
};

export const WithoutDownloads: Story = {
  args: {
    enabledLayers: sampleEnabledLayers.map(layer => ({ ...layer, downloadable: false })),
    disabledLayers: sampleDisabledLayers.map(layer => ({ ...layer, downloadable: false })),
    renderLayerIcon: (layer) => <MockLayerIcon layer={layer} />,
    onLayerDownload: undefined
  }
};

export const NoEnabledLayers: Story = {
  args: {
    enabledLayers: [],
    disabledLayers: sampleDisabledLayers,
    renderLayerIcon: (layer) => <MockLayerIcon layer={layer} />
  }
};

export const NoDisabledLayers: Story = {
  args: {
    enabledLayers: sampleEnabledLayers,
    disabledLayers: [],
    renderLayerIcon: (layer) => <MockLayerIcon layer={layer} />
  }
};

export const WithRealThumbnails: Story = {
  args: {
    enabledLayers: sampleEnabledLayers,
    disabledLayers: sampleDisabledLayers.map(layer => ({
      ...layer,
      id: layer.id.includes('raster') ? `satellite-${layer.id}` : layer.id
    })),
    renderLayerIcon: (layer) => <MockLayerIcon layer={layer} />,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the LayerControl with various thumbnail types including images, gradients, and icons.'
      }
    }
  }
};

export const CustomStyling: Story = {
  args: {
    enabledLayers: sampleEnabledLayers,
    disabledLayers: sampleDisabledLayers,
    renderLayerIcon: (layer) => <MockLayerIcon layer={layer} />,
    className: 'custom-layer-control'
  },
  decorators: [
    (Story) => (
      <div style={{ 
        width: 400, 
        height: 600, 
        border: '2px solid #2196F3', 
        borderRadius: 8,
        backgroundColor: '#f8f9fa'
      }}>
        <style>{`
          .custom-layer-control {
            --text: #1a1a1a;
            --comp-bg: #ffffff;
            --page-bg: #f8f9fa;
            --select: #2196F3;
            --comp-trim: #666666;
          }
        `}</style>
        <Story />
      </div>
    ),
  ],
};