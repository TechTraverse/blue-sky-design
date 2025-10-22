export { Button } from './components/Button';
export type { ButtonProps } from './components/Button';

export { Header } from './components/Header';
export type { HeaderProps } from './components/Header';

export { Page } from './components/Page';

export { TimeRangeSlider } from './components/TimeRangeSlider/TimeRangeSlider';
export type { TimeRangeSliderProps } from './components/TimeRangeSlider/TimeRangeSliderSimplified';
export { TimeDuration, Theme, TimeZone } from './components/TimeRangeSlider/timeSliderTypes';

// MapComponent exports
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
export { MapService, MapServiceLayer, MapServiceAdapter, createMapServiceEffect } from './components/MapComponent';
export type { MapServiceEffect, LayerType } from './components/MapComponent';
