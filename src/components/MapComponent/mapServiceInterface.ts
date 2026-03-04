// Clean abstraction layer that hides effect-ts from consuming apps
// Provides both Promise-based and effect-ts APIs

import { Effect as E } from "effect";
import type { LayerType, MapServiceImpl } from "./mapService";
import type { Layer, MapOperations, MapEvent } from "./types";
import type { Map as MapLibreMap } from "maplibre-gl";
import { LayerEnabled, LayerVisible } from "./mapService";

// Convert internal LayerType to clean Layer interface
export function convertLayerType(layer: LayerType): Layer {
  if (layer._tag === "Basemap" || layer._tag === "Labels") {
    return {
      id: layer.id,
      type: 'basemap',
      visible: true,
    };
  }
  return {
    id: layer.id,
    type: layer._tag === "LargeScaleImagery" || layer._tag === "SmallScaleImagery" ? 'raster' : 'vector',
    sourceConfig: layer.sourceConfig as any,
    layerConfigs: layer.orderedLayerConfigs as any,
    visible: true, // TODO: extract from layer.enabled
  };
}

// Convert clean Layer interface to internal LayerType
export function convertToLayerType(layer: Layer): LayerType {
  // Create a minimal CustomOrder layer for generic layers
  return {
    _tag: "CustomOrder",
    id: layer.id,
    humanReadableName: layer.name || layer.id,
    sourceConfig: layer.sourceConfig as any,
    orderedLayerConfigs: layer.layerConfigs || [],
    paramKeyVals: {},
    enabled: layer.visible !== false
      ? LayerEnabled({ visible: LayerVisible(), order: 0 })
      : { _tag: "LayerDisabled", selectable: { _tag: "LayerSelectable" } },
  } as LayerType;
}

// Promise-based wrapper around effect-ts MapService
export class MapServiceAdapter implements MapOperations {
  constructor(private mapService: MapServiceImpl) {}

  async addLayer(layer: Layer, _above?: string): Promise<void> {
    const layerType = convertToLayerType(layer);
    const effect = this.mapService.addLayer(layerType);
    await E.runPromise(effect as E.Effect<undefined, Error, never>);
  }

  async removeLayer(layerId: string): Promise<void> {
    // Create minimal layer object for removal
    const layerType = {
      _tag: "CustomOrder",
      id: layerId,
      humanReadableName: layerId,
      sourceConfig: { _tag: "GeoJsonData", id: layerId, data: "" },
      orderedLayerConfigs: [],
      paramKeyVals: {},
      enabled: LayerEnabled({ visible: LayerVisible(), order: 0 }),
    } as unknown as LayerType;
    const effect = this.mapService.rmLayer(layerType);
    await E.runPromise(effect as E.Effect<void, Error, never>);
  }

  async updateLayer(layer: Layer): Promise<void> {
    // For updates, remove and re-add
    await this.removeLayer(layer.id);
    await this.addLayer(layer);
  }

  async setBasemap(basemapConfig: string | any): Promise<void> {
    const resourceUrl = typeof basemapConfig === 'string' ? basemapConfig : (basemapConfig.tileUrl || 'custom-style');
    const basemapLayer = {
      _tag: "Basemap",
      id: "basemap",
      humanReadableName: "Basemap",
      resourceUrl: resourceUrl,
      paramKeyVals: {},
      enabled: LayerEnabled({ visible: LayerVisible(), order: 1000 }),
    } as unknown as LayerType;
    const effect = this.mapService.addLayer(basemapLayer);
    await E.runPromise(effect as E.Effect<undefined, Error, never>);
  }

  async zoomTo(bounds: [number, number, number, number]): Promise<void> {
    const map = this.mapService.getMapInstance();
    map.fitBounds(bounds);
  }

  async flyTo(options: { center: [number, number]; zoom: number }): Promise<void> {
    const map = this.mapService.getMapInstance();
    map.flyTo({ center: options.center, zoom: options.zoom });
  }

  async queryRenderedFeatures(point?: { x: number; y: number }): Promise<any[]> {
    const map = this.mapService.getMapInstance();
    return map.queryRenderedFeatures(point as any);
  }

  getSource(sourceId: string): any {
    const map = this.mapService.getMapInstance();
    return map.getSource(sourceId);
  }

  getLayer(layerId: string): any {
    const map = this.mapService.getMapInstance();
    return map.getLayer(layerId);
  }

  // Event handler registration with clean callback interface
  async registerEventHandler(
    eventName: string,
    handler: (event: MapEvent) => void
  ): Promise<() => void> {
    const effect = this.mapService.registerEventHandler(eventName, (e: unknown, map: MapLibreMap) => {
      // Convert maplibre event to clean MapEvent interface
      const cleanEvent: MapEvent = {
        type: eventName,
        originalEvent: (e as any).originalEvent,
        point: (e as any).point,
        lngLat: (e as any).lngLat,
        features: (e as any).features,
        target: map,
      };
      handler(cleanEvent);
    });

    const subscription = await E.runPromise(effect);
    return () => subscription.unsubscribe();
  }

  // Get direct access to maplibre instance for advanced usage
  getMapInstance(): MapLibreMap {
    return this.mapService.getMapInstance();
  }
}

// Effect-ts enhanced interface for advanced users
export interface MapServiceEffect {
  // Direct access to effect-ts service
  service: MapServiceImpl;

  // Enhanced operations that return effects
  addLayerEffect: (layer: LayerType) => E.Effect<void, Error, void>;
  removeLayerEffect: (layer: LayerType) => E.Effect<void, Error, void>;
  updateMapOptionsEffect: (options: { zoom?: number; center?: [number, number] }) => E.Effect<void, Error, void>;

  // Event handling with effect-ts
  registerEventHandlerEffect: (eventName: string, handler: (e: unknown, map: MapLibreMap) => void) => E.Effect<any>;

  // Access to underlying map instance
  getMapInstance: () => MapLibreMap;
}

export function createMapServiceEffect(mapService: MapServiceImpl): MapServiceEffect {
  return {
    service: mapService,
    addLayerEffect: (layer: LayerType) => mapService.addLayer(layer) as E.Effect<void, Error, void>,
    removeLayerEffect: (layer: LayerType) => mapService.rmLayer(layer) as E.Effect<void, Error, void>,
    updateMapOptionsEffect: (options) => mapService.updateMapOptions(options) as E.Effect<void, Error, void>,
    registerEventHandlerEffect: (eventName, handler) => mapService.registerEventHandler(eventName, handler),
    getMapInstance: () => mapService.getMapInstance(),
  };
}
