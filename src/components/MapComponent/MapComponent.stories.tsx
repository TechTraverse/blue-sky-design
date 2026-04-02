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

// === Basemap Fallback Stories ===
// These demonstrate the fallback configuration and solid color background

// Shows fallback options configured with Esri as fallback
export const WithFallbackToEsri: Story = {
  args: {
    style: { height: '500px' },
    initialBasemap: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    fallbackOptions: {
      fallbackBasemap: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      solidColorFallback: '#1a365d',
      onBasemapFallback: (info) => {
        console.log('Basemap fallback triggered:', info);
        console.log('Reason:', info.reason.type, 'Using solid color:', info.usingSolidColor);
      },
    },
    onMapReady: () => console.log('Map ready - fallback configured for auth errors'),
  },
};

// Directly shows solid color background (simulates final fallback state)
export const SolidColorBackground: Story = {
  args: {
    style: { height: '500px' },
    initialBasemap: {
      style: {
        version: 8,
        sources: {},
        layers: [{
          id: 'background-solid',
          type: 'background',
          paint: { 'background-color': '#1a365d' }
        }]
      }
    },
    initialCenter: [-98.58, 39.83],
    initialZoom: 4,
    onMapReady: () => console.log('Solid color background loaded'),
  },
};

// Shows that overlay layers render correctly on solid background
export const SolidColorWithOverlays: Story = {
  args: {
    style: { height: '500px' },
    initialBasemap: {
      style: {
        version: 8,
        sources: {
          'cities-data': {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [
                { type: 'Feature', geometry: { type: 'Point', coordinates: [-104.99, 39.74] }, properties: { name: 'Denver' } },
                { type: 'Feature', geometry: { type: 'Point', coordinates: [-122.42, 37.77] }, properties: { name: 'San Francisco' } },
                { type: 'Feature', geometry: { type: 'Point', coordinates: [-73.94, 40.73] }, properties: { name: 'New York' } },
              ]
            }
          }
        },
        layers: [
          {
            id: 'background-solid',
            type: 'background',
            paint: { 'background-color': '#1a365d' }
          },
          {
            id: 'city-circles',
            type: 'circle',
            source: 'cities-data',
            paint: {
              'circle-radius': 8,
              'circle-color': '#ff6b6b',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff'
            }
          }
        ]
      }
    },
    initialCenter: [-98.58, 39.83],
    initialZoom: 4,
    onMapReady: () => console.log('Solid background with overlay circles visible'),
  },
};

// Effect-ts enhanced stories - using render functions to work with MapComponentEffect
// Basic effect-ts usage
export const EffectBasic: Story = {
  render: () => (
    <MapComponentEffect
      style={{ height: '500px' }}
      onMapServiceReady={(mapServiceEffect) => {
        console.log('MapService effect ready:', mapServiceEffect);
      }}
      onEffectError={(error) => {
        console.error('Effect error:', error);
      }}
    />
  ),
};

// With initialization effect
export const EffectWithInitialization: Story = {
  render: () => (
    <MapComponentEffect
      style={{ height: '500px' }}
      initializationEffect={(mapService) =>
        E.gen(function* () {
          console.log('Initializing map service...');
          yield* mapService.log();
          console.log('Map service initialized!');
        })
      }
      onMapServiceReady={() => {
        console.log('Enhanced MapService ready with initialization');
      }}
    />
  ),
};

// Advanced effect-ts usage
export const EffectAdvanced: Story = {
  render: () => (
    <MapComponentEffect
      style={{ height: '500px' }}
      initialCenter={[-73.935242, 40.730610]}
      initialZoom={11}
      eventHandlers={{
        onClick: (event) => {
          console.log('Effect-enhanced click:', event);
        },
      }}
      initializationEffect={(mapService) =>
        E.gen(function* () {
          console.log('Setting up advanced map features...');
          yield* mapService.updateMapOptions({
            center: [-73.935242, 40.730610],
            zoom: 11
          });
          yield* mapService.log();
        })
      }
      onMapServiceReady={(mapServiceEffect) => {
        console.log('Advanced effect map ready with full configuration');
        const mapInstance = mapServiceEffect.getMapInstance();
        console.log('Direct map instance access:', mapInstance);
      }}
    />
  ),
};