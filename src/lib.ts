export { Banner } from './components/Banner';
export type { BannerProps } from './components/Banner';

export { Button } from './components/Button';
export type { ButtonProps } from './components/Button';

export { Header } from './components/Header';
export type { HeaderProps } from './components/Header';

export { Page } from './components/Page';

export { TimeRangeSlider } from './components/TimeRangeSlider/TimeRangeSlider';
export type { TimeRangeSliderProps } from './components/TimeRangeSlider/TimeRangeSlider';
export { TimeDuration, Theme, TimeZone, AnimationOrStepMode } from './components/TimeRangeSlider/timeSliderTypes';

// MapComponent exports - React-only and effect-ts enhanced APIs
export { MapComponent, MapComponentEffect } from './components/MapComponent';
export type { 
  MapComponentProps, 
  MapComponentRef, 
  MapComponentEffectProps, 
  MapComponentEffectRef,
  MapSettings,
  Layer,
  LayerConfig,
  SourceConfig,
  MapEvent,
  MapEventHandlers,
  MapControls,
  MapOperations,
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
} from './components/MapComponent';

// Advanced exports for effect-ts integration
export {
  MapService,
  MapServiceLayer,
  MapClassWrapper,
  MapServiceAdapter,
  createMapServiceEffect,
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
} from './components/MapComponent';

export type {
  MapServiceEffect,
  LayerType,
  MapServiceSettings,
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
} from './components/MapComponent';

// Draw service exports (terra-draw based)
export {
  DrawService,
  createDrawServiceLayer,
  DrawModes,
  // Low-level factory for consumers managing their own Effect services
  createTerraDraw,
} from './components/MapComponent';

export type {
  DrawServiceImpl,
  DrawFinishEvent,
  TerraDrawWrapper,
} from './components/MapComponent';

// LayerControl exports
export { LayerControl, SimplifiedLayerControl, LayerList, LayerItem } from './components/LayerControl';
export type { LayerControlProps, SimplifiedLayerControlProps, LayerItem as LayerItemType, LayerListProps, LayerItemComponentProps, LayerGroup } from './components/LayerControl';

// SidePanel exports
export { SidePanel } from './components/SidePanel';
export type { SidePanelProps } from './components/SidePanel';
