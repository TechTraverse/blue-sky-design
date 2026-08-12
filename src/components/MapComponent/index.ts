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
  BasemapFallbackReason,
  BasemapFallbackInfo,
  BasemapFallbackOptions,
  LayerLoadStatus,
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

// Layer load status constructors
export { Loading, Loaded, Empty, LoadError, Timeout } from './types';

// Service interface exports (for advanced usage)
export { MapServiceAdapter, createMapServiceEffect } from './mapServiceInterface';
export type { MapServiceEffect } from './mapServiceInterface';

// Direct service exports (for effect-ts integration)
export {
  MapService,
  MapServiceLayer,
  createMapServiceLayer,
  MapClassWrapper,
  createSolidColorStyle,
  BASEMAP_PREFIX,
  LABELS_PREFIX,
  COMMON_PREFIX,
  extractLayerResourceId,
  getParamaterizedUrl,
  // Basemap fallback helpers
  isTileTemplateUrl,
  extractHostname,
  collectBasemapDomains,
  collectDomainsFromStylesheet,
  isBasemapAuthError,
  mergeStylesheetDomains,
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
  MapServiceImpl,
} from './mapService';