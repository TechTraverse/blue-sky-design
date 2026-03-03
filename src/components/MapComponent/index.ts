// Main exports for MapComponent
export { MapComponent } from './MapComponent';
export type { MapComponentProps, MapComponentRef } from './MapComponent';

// Enhanced effect-ts component
export { MapComponentEffect } from './MapComponentEffect';
export type { MapComponentEffectProps, MapComponentEffectRef } from './MapComponentEffect';

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
  BasemapConfig,
  ExtendedLayer,
  VectorSourceConfig,
  RasterSourceConfig,
  GeoJSONSourceConfig,
  LayerTypes,
  TypedLayerConfig,
  MapTheme,
  MapStyleConfig,
  AnimationOptions,
  TransitionOptions,
  AdvancedMapOperations,
} from './types';

// Service interface exports (for advanced usage)
export { MapServiceAdapter, createMapServiceEffect } from './mapServiceInterface';
export type { MapServiceEffect } from './mapServiceInterface';

// Direct service exports (for effect-ts integration)
export {
  MapService,
  MapServiceLayer,
  MapClassWrapper,
  BASEMAP_PREFIX,
  LABELS_PREFIX,
  getParamaterizedUrl,
  // Tagged enum constructors
  VectorTiles,
  RasterTiles,
  GeoJsonData,
  LayerVisible,
  LayerHidden,
  LayerDimmed,
  LayerSelectable,
  LayerUnselectable,
  LayerEnabled,
  LayerDisabled,
  Basemap,
  Labels,
  LargeScaleVector,
  SmallScaleVector,
  LargeScaleImagery,
  SmallScaleImagery,
  CustomOrder,
} from './mapService';

export type {
  LayerType,
  MapSettings as MapServiceSettings,
  MapControlsConfig,
  SourcePropsType,
  SourceProps,
  LayerVisibility,
  LayerSelectability,
  LayerEnabledOptions,
  LayerDisabledOptions,
  LayerEnabledState,
  LayerResourceDescriptor,
  ExtStyle,
} from './mapService';