// Main exports for MapComponent
export { MapComponent } from './MapComponent';
export type { MapComponentProps, MapComponentRef } from './MapComponent';

// Type exports
export type {
  MapSettings,
  Layer,
  LayerConfig,
  SourceConfig,
  MapEvent,
  MapEventHandlers,
  MapControls,
  MapComponentCallbacks,
  MapOperations,
  MapComponentCoreProps,
} from './types';

// Service interface exports (for advanced usage)
export { MapServiceAdapter, createMapServiceEffect } from './mapServiceInterface';
export type { MapServiceEffect } from './mapServiceInterface';

// Direct service exports (for effect-ts integration)
export { MapService, MapServiceLayer } from './mapService';
export type { LayerType } from './mapService';