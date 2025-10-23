import type { Meta, StoryObj } from '@storybook/react-vite';
import { MapComponent, MapComponentEffect } from './index';
import { Effect as E } from 'effect';

const meta = {
  component: MapComponent,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof MapComponent>;

export default meta;

type Story = StoryObj<typeof meta>;

// Basic React-only usage
export const Default: Story = {
  args: {
    style: { height: '500px' },
    onMapReady: () => console.log('Map ready!'),
    onLayerAdd: (layer) => console.log('Layer added:', layer),
  },
};

// With custom initial position
export const CustomPosition: Story = {
  args: {
    style: { height: '500px' },
    initialCenter: [-74.006, 40.7128], // New York City
    initialZoom: 10,
    onMapReady: () => console.log('NYC map ready!'),
  },
};

// With different basemap options
export const DifferentBasemap: Story = {
  args: {
    style: { height: '500px' },
    initialBasemap: 'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
    initialCenter: [-122.4194, 37.7749], // San Francisco
    initialZoom: 12,
    onBasemapChange: (url) => console.log('Basemap changed to:', url),
  },
};

// With event handlers
export const WithEventHandlers: Story = {
  args: {
    style: { height: '500px' },
    eventHandlers: {
      onClick: (event) => console.log('Map clicked:', event.lngLat),
      onMouseMove: (event) => console.log('Mouse moved:', event.lngLat),
      onZoomEnd: () => console.log('Zoom ended'),
    },
    onMapReady: () => console.log('Interactive map ready!'),
  },
};

// With initial layers
export const WithLayers: Story = {
  args: {
    style: { height: '500px' },
    initialLayers: [
      {
        id: 'sample-geojson',
        type: 'overlay',
        sourceConfig: {
          id: 'sample-data',
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [-122.4194, 37.7749]
                },
                properties: {
                  name: 'San Francisco'
                }
              }
            ]
          }
        }
      }
    ],
    initialCenter: [-122.4194, 37.7749],
    initialZoom: 10,
    onLayerAdd: (layer) => console.log('Added layer:', layer.id),
  },
};

// Disabled controls
export const MinimalControls: Story = {
  args: {
    style: { height: '500px' },
    controls: {
      navigation: false,
      fullscreen: false,
      geolocate: false,
      scale: true,
    },
    onMapReady: () => console.log('Minimal map ready!'),
  },
};

// Alternative basemap providers (all CORS-friendly, no API key required)
export const CartoDarkBasemap: Story = {
  args: {
    style: { height: '500px' },
    initialBasemap: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
    initialCenter: [-74.006, 40.7128], // New York
    initialZoom: 10,
    onMapReady: () => console.log('Carto Dark map ready!'),
  },
};

export const CartoLightBasemap: Story = {
  args: {
    style: { height: '500px' },
    initialBasemap: 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
    initialCenter: [2.3522, 48.8566], // Paris
    initialZoom: 12,
    onMapReady: () => console.log('Carto Light map ready!'),
  },
};

export const OpenTopoMapBasemap: Story = {
  args: {
    style: { height: '500px' },
    initialBasemap: 'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
    initialCenter: [-119.6492, 37.4267], // Yosemite
    initialZoom: 10,
    onMapReady: () => console.log('OpenTopoMap ready!'),
  },
};

// Custom basemap configuration examples
export const CustomBasemapConfig: Story = {
  args: {
    style: { height: '500px' },
    initialBasemap: {
      tileUrl: 'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
      attribution: '© OpenStreetMap contributors © CARTO',
      tileSize: 256,
      minZoom: 0,
      maxZoom: 20
    },
    initialCenter: [-104.9903, 39.7392], // Denver (default)
    initialZoom: 10,
    onMapReady: () => console.log('Custom basemap config ready!'),
  },
};

export const FullStyleBasemap: Story = {
  args: {
    style: { height: '500px' },
    initialBasemap: {
      style: {
        version: 8,
        sources: {
          'custom-raster': {
            type: 'raster',
            tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors © CARTO'
          }
        },
        layers: [
          {
            id: 'custom-background',
            type: 'background',
            paint: {
              'background-color': '#f8f8f8'
            }
          },
          {
            id: 'custom-tiles',
            type: 'raster',
            source: 'custom-raster'
          }
        ]
      }
    },
    initialCenter: [-104.9903, 39.7392], // Denver (default)
    initialZoom: 8,
    onMapReady: () => console.log('Full custom style ready!'),
  },
};

// Effect-ts enhanced stories
const EffectMeta = {
  component: MapComponentEffect,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof MapComponentEffect>;

type EffectStory = StoryObj<typeof EffectMeta>;

// Basic effect-ts usage
export const EffectBasic: EffectStory = {
  args: {
    style: { height: '500px' },
    onMapServiceReady: (mapServiceEffect) => {
      console.log('MapService effect ready:', mapServiceEffect);
    },
    onEffectError: (error) => {
      console.error('Effect error:', error);
    },
  },
};

// With initialization effect
export const EffectWithInitialization: EffectStory = {
  args: {
    style: { height: '500px' },
    initializationEffect: (mapService) => 
      E.gen(function* () {
        console.log('Initializing map service...');
        yield* mapService.log();
        console.log('Map service initialized!');
      }),
    onMapServiceReady: (mapServiceEffect) => {
      console.log('Enhanced MapService ready with initialization');
    },
  },
};

// Advanced effect-ts usage
export const EffectAdvanced: EffectStory = {
  args: {
    style: { height: '500px' },
    initialCenter: [-73.935242, 40.730610], // Brooklyn
    initialZoom: 11,
    eventHandlers: {
      onClick: (event) => {
        console.log('Effect-enhanced click:', event);
      },
    },
    initializationEffect: (mapService) => 
      E.gen(function* () {
        console.log('Setting up advanced map features...');
        yield* mapService.updateMapOptions({
          center: [-73.935242, 40.730610],
          zoom: 11
        });
        yield* mapService.log();
      }),
    onMapServiceReady: (mapServiceEffect) => {
      console.log('Advanced effect map ready with full configuration');
      
      // Example of running effects through the service
      const mapInstance = mapServiceEffect.getMapInstance();
      console.log('Direct map instance access:', mapInstance);
    },
  },
};

// Export effect stories with different component
export const EffectBasicStory = EffectBasic;
export const EffectWithInitializationStory = EffectWithInitialization;
export const EffectAdvancedStory = EffectAdvanced;