// Clean TypeScript interfaces for external consumption
// Separates effect-ts internal types from public API

export interface MapSettings {
  zoom?: number;
  center?: [number, number];
}

export interface LayerConfig {
  id: string;
  type: string;
  source?: string;
  layout?: Record<string, any>;
  paint?: Record<string, any>;
  filter?: any[];
  minzoom?: number;
  maxzoom?: number;
}

export interface SourceConfig {
  id: string;
  type: 'vector' | 'raster' | 'geojson' | 'image' | 'video' | 'canvas';
  url?: string;
  tiles?: string[];
  data?: string | object;
  scheme?: 'xyz' | 'tms';
  tileSize?: number;
  attribution?: string;
  bounds?: [number, number, number, number];
  minzoom?: number;
  maxzoom?: number;
}

export interface Layer {
  id: string;
  type: 'basemap' | 'overlay' | 'vector' | 'raster';
  name?: string;
  description?: string;
  visible?: boolean;
  opacity?: number;
  sourceConfig?: SourceConfig;
  layerConfigs?: LayerConfig[];
  metadata?: Record<string, any>;
}

export interface MapEvent {
  type: string;
  originalEvent?: Event;
  point?: { x: number; y: number };
  lngLat?: { lng: number; lat: number };
  features?: any[];
  target?: any;
}

export interface MapEventHandlers {
  onLoad?: () => void;
  onClick?: (event: MapEvent) => void;
  onMouseMove?: (event: MapEvent) => void;
  onMouseEnter?: (event: MapEvent) => void;
  onMouseLeave?: (event: MapEvent) => void;
  onZoomEnd?: () => void;
  onMoveEnd?: () => void;
  onStyleData?: () => void;
  onSourceData?: () => void;
  onError?: (error: Error) => void;
}

export interface MapControls {
  navigation?: boolean;
  fullscreen?: boolean;
  geolocate?: boolean;
  scale?: boolean;
}

// Callback-based API types (for React-only usage)
export interface MapComponentCallbacks {
  onLayerAdd?: (layer: Layer) => void;
  onLayerRemove?: (layerId: string) => void;
  onLayerUpdate?: (layer: Layer) => void;
  onBasemapChange?: (basemapUrl: string) => void;
  onMapReady?: () => void;
  onMapError?: (error: Error) => void;
}

// Promise-based operations (converted from effect-ts)
export interface MapOperations {
  addLayer: (layer: Layer, above?: string) => Promise<void>;
  removeLayer: (layerId: string) => Promise<void>;
  updateLayer: (layer: Layer) => Promise<void>;
  setBasemap: (basemapUrl: string) => Promise<void>;
  zoomTo: (bounds: [number, number, number, number]) => Promise<void>;
  flyTo: (options: { center: [number, number]; zoom: number }) => Promise<void>;
  queryRenderedFeatures: (point?: { x: number; y: number }) => Promise<any[]>;
  getSource: (sourceId: string) => any;
  getLayer: (layerId: string) => any;
}

// Core component props interface
export interface MapComponentCoreProps {
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  
  // Map configuration
  initialCenter?: [number, number];
  initialZoom?: number;
  initialBasemap?: string;
  
  // Controls
  controls?: MapControls;
  
  // Event handlers
  eventHandlers?: MapEventHandlers;
  
  // Children (for custom overlays)
  children?: React.ReactNode;
}