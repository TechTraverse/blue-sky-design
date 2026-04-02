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
  layout?: Record<string, unknown>;
  paint?: Record<string, unknown>;
  filter?: unknown[];
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
  metadata?: Record<string, unknown>;
}

export interface MapEvent {
  type: string;
  originalEvent?: Event;
  point?: { x: number; y: number };
  lngLat?: { lng: number; lat: number };
  features?: unknown[];
  target?: unknown;
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

// Basemap configuration options
export interface BasemapConfig {
  // Simple tile URL (will be converted to proper style)
  tileUrl?: string;
  // Or full MapLibre style specification (version must be 8)
  style?: {
    version: 8;
    sources: Record<string, unknown>;
    layers: unknown[];
    [key: string]: unknown;
  };
  // Custom attribution text
  attribution?: string;
  // Tile size (default: 256)
  tileSize?: number;
  // Min/max zoom levels
  minZoom?: number;
  maxZoom?: number;
}

// Basemap fallback types (for 401/403 error handling)
export type BasemapFallbackReason =
  | { type: 'auth_error'; status: 401 | 403; url: string }
  | { type: 'load_error'; error: Error; url: string }
  | { type: 'timeout'; url: string };

export interface BasemapFallbackInfo {
  reason: BasemapFallbackReason;
  originalBasemap: string | BasemapConfig;
  fallbackBasemap?: string | BasemapConfig;
  usingSolidColor: boolean;
}

export interface BasemapFallbackOptions {
  // Fallback basemap to try if primary fails with 401/403
  fallbackBasemap?: string | BasemapConfig;
  // Callback when fallback is triggered
  onBasemapFallback?: (info: BasemapFallbackInfo) => void;
  // Solid color to use as final fallback (default: '#1a365d' dark blue)
  solidColorFallback?: string;
}

// Promise-based operations (converted from effect-ts)
export interface MapOperations {
  addLayer: (layer: Layer, above?: string) => Promise<void>;
  removeLayer: (layerId: string) => Promise<void>;
  updateLayer: (layer: Layer) => Promise<void>;
  setBasemap: (basemapUrl: string | BasemapConfig) => Promise<void>;
  zoomTo: (bounds: [number, number, number, number]) => Promise<void>;
  flyTo: (options: { center: [number, number]; zoom: number }) => Promise<void>;
  queryRenderedFeatures: (point?: { x: number; y: number }) => Promise<unknown[]>;
  getSource: (sourceId: string) => unknown;
  getLayer: (layerId: string) => unknown;
}

// Core component props interface
export interface MapComponentCoreProps {
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  
  // Map configuration
  initialCenter?: [number, number];
  initialZoom?: number;
  initialBasemap?: string | BasemapConfig;
  initialBounds?: [number, number, number, number];

  /** Basemap fallback configuration for 401/403 error handling */
  fallbackOptions?: BasemapFallbackOptions;
  
  // Controls
  controls?: MapControls;
  
  // Event handlers
  eventHandlers?: MapEventHandlers;
  
  // Interaction options
  interactive?: boolean;
  scrollZoom?: boolean;
  boxZoom?: boolean;
  dragRotate?: boolean;
  dragPan?: boolean;
  keyboard?: boolean;
  doubleClickZoom?: boolean;
  touchZoomRotate?: boolean;
  
  // Styling options
  attributionControl?: boolean;
  logoPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  
  // Performance options
  preserveDrawingBuffer?: boolean;
  antialias?: boolean;
  
  // Children (for custom overlays)
  children?: React.ReactNode;
}

// Extended layer interface with more options
export interface ExtendedLayer extends Layer {
  minzoom?: number;
  maxzoom?: number;
  filter?: unknown[];
  layout?: Record<string, unknown>;
  paint?: Record<string, unknown>;
  beforeId?: string;
}

// Advanced source configurations
export interface VectorSourceConfig extends SourceConfig {
  type: 'vector';
  promoteId?: string | Record<string, string>;
  buffer?: number;
  tolerance?: number;
  cluster?: boolean;
  clusterMaxZoom?: number;
  clusterRadius?: number;
  clusterMinPoints?: number;
  clusterProperties?: Record<string, unknown>;
  lineMetrics?: boolean;
  generateId?: boolean;
}

export interface RasterSourceConfig extends SourceConfig {
  type: 'raster';
  encoding?: 'terrarium' | 'mapbox';
}

export interface GeoJSONSourceConfig extends SourceConfig {
  type: 'geojson';
  data: string | object;
  maxzoom?: number;
  buffer?: number;
  tolerance?: number;
  cluster?: boolean;
  clusterMaxZoom?: number;
  clusterRadius?: number;
  clusterMinPoints?: number;
  clusterProperties?: Record<string, unknown>;
  lineMetrics?: boolean;
  generateId?: boolean;
  promoteId?: string | Record<string, string>;
}

// Layer type definitions for better type safety
export type LayerTypes = 
  | 'fill'
  | 'line' 
  | 'symbol'
  | 'circle'
  | 'heatmap'
  | 'fill-extrusion'
  | 'raster'
  | 'hillshade'
  | 'background'
  | 'sky';

export interface TypedLayerConfig extends Omit<LayerConfig, 'type'> {
  type: LayerTypes;
}

// Map style and theming
export interface MapTheme {
  primary?: string;
  secondary?: string;
  background?: string;
  surface?: string;
  text?: string;
  accent?: string;
}

export interface MapStyleConfig {
  theme?: MapTheme;
  customCSS?: string;
  darkMode?: boolean;
}

// Animation and transition options
export interface AnimationOptions {
  duration?: number;
  easing?: string;
  essential?: boolean;
}

export interface TransitionOptions {
  duration?: number;
  delay?: number;
}

// Advanced map operations
export interface AdvancedMapOperations extends MapOperations {
  // Layer management
  moveLayer: (layerId: string, beforeId?: string) => Promise<void>;
  updateLayerVisibility: (layerId: string, visible: boolean) => Promise<void>;
  updateLayerOpacity: (layerId: string, opacity: number) => Promise<void>;
  getLayerVisibility: (layerId: string) => boolean;
  
  // Source management
  updateSource: (sourceId: string, data: unknown) => Promise<void>;
  hasSource: (sourceId: string) => boolean;

  // Style operations
  setStyle: (styleUrl: string) => Promise<void>;
  getStyle: () => unknown;
  isStyleLoaded: () => boolean;
  
  // Camera operations
  easeTo: (options: { center?: [number, number]; zoom?: number; bearing?: number; pitch?: number } & AnimationOptions) => Promise<void>;
  jumpTo: (options: { center?: [number, number]; zoom?: number; bearing?: number; pitch?: number }) => Promise<void>;
  fitBounds: (bounds: [number, number, number, number], options?: { padding?: number; maxZoom?: number } & AnimationOptions) => Promise<void>;
  
  // Query operations
  querySourceFeatures: (sourceId: string, parameters?: { sourceLayer?: string; filter?: unknown }) => unknown[];
  queryRenderedFeatures: (pointOrBounds?: { x: number; y: number } | [{ x: number; y: number }, { x: number; y: number }], options?: { layers?: string[]; filter?: unknown }) => Promise<unknown[]>;
  
  // Utility operations
  project: (lngLat: [number, number]) => { x: number; y: number };
  unproject: (point: { x: number; y: number }) => [number, number];
  getBounds: () => [number, number, number, number];
  getCenter: () => [number, number];
  getZoom: () => number;
  getBearing: () => number;
  getPitch: () => number;
  
  // Image and sprite management
  addImage: (id: string, image: HTMLImageElement | ImageData | { width: number; height: number; data: Uint8Array | Uint8ClampedArray }, options?: { pixelRatio?: number; sdf?: boolean; stretchX?: Array<[number, number]>; stretchY?: Array<[number, number]>; content?: [number, number, number, number] }) => Promise<void>;
  removeImage: (id: string) => Promise<void>;
  hasImage: (id: string) => boolean;
}