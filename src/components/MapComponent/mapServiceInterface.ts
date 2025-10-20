// Clean abstraction layer that hides effect-ts from consuming apps
// Provides both Promise-based and effect-ts APIs

import { Effect as E } from "effect";
import { MapService, LayerType } from "./mapService";
import { Layer, MapOperations, MapEvent } from "./types";
import { Map } from "maplibre-gl";

// Convert internal LayerType to clean Layer interface
export function convertLayerType(layer: LayerType): Layer {
  return {
    id: layer.id,
    type: layer._tag as any,
    sourceConfig: layer.sourceConfig as any,
    layerConfigs: layer.orderedLayerConfigs as any,
    visible: true, // TODO: extract from layer.enabled
  };
}

// Convert clean Layer interface to internal LayerType
export function convertToLayerType(layer: Layer): LayerType {
  return {
    _tag: layer.type,
    id: layer.id,
    sourceConfig: layer.sourceConfig as any,
    orderedLayerConfigs: layer.layerConfigs as any,
    enabled: layer.visible ? { _tag: "LayerEnabled" } : { _tag: "LayerDisabled" },
  };
}

// Promise-based wrapper around effect-ts MapService
export class MapServiceAdapter implements MapOperations {
  constructor(private mapService: MapService, private runtime: any) {}

  async addLayer(layer: Layer, above?: string): Promise<void> {
    const layerType = convertToLayerType(layer);
    const effect = this.mapService.addLayer(layerType);
    return this.runtime.runPromise(effect);
  }

  async removeLayer(layerId: string): Promise<void> {
    const layerType: LayerType = {
      _tag: "overlay",
      id: layerId,
    };
    const effect = this.mapService.rmLayer(layerType);
    return this.runtime.runPromise(effect);
  }

  async updateLayer(layer: Layer): Promise<void> {
    // For updates, remove and re-add
    await this.removeLayer(layer.id);
    await this.addLayer(layer);
  }

  async setBasemap(basemapUrl: string): Promise<void> {
    const basemapLayer: LayerType = {
      _tag: "Basemap",
      id: "basemap",
      resourceUrl: basemapUrl,
    };
    const effect = this.mapService.addLayer(basemapLayer);
    return this.runtime.runPromise(effect);
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
    return map.queryRenderedFeatures(point);
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
    const effect = this.mapService.registerEventHandler(eventName, (e, map) => {
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
    
    const subscription = await this.runtime.runPromise(effect);
    return () => subscription.unsubscribe();
  }

  // Get direct access to maplibre instance for advanced usage
  getMapInstance(): Map {
    return this.mapService.getMapInstance();
  }
}

// Effect-ts enhanced interface for advanced users
export interface MapServiceEffect {
  // Direct access to effect-ts service
  service: MapService;
  
  // Enhanced operations that return effects
  addLayerEffect: (layer: LayerType) => E.Effect<void, Error, void>;
  removeLayerEffect: (layer: LayerType) => E.Effect<void, Error, void>;
  updateMapOptionsEffect: (options: { zoom?: number; center?: [number, number] }) => E.Effect<void, Error, void>;
  
  // Event handling with effect-ts
  registerEventHandlerEffect: (eventName: string, handler: (e: unknown, map: Map) => void) => E.Effect<any>;
  
  // Access to underlying map instance
  getMapInstance: () => Map;
}

export function createMapServiceEffect(mapService: MapService): MapServiceEffect {
  return {
    service: mapService,
    addLayerEffect: (layer: LayerType) => mapService.addLayer(layer),
    removeLayerEffect: (layer: LayerType) => mapService.rmLayer(layer),
    updateMapOptionsEffect: (options) => mapService.updateMapOptions(options),
    registerEventHandlerEffect: (eventName, handler) => mapService.registerEventHandler(eventName, handler),
    getMapInstance: () => mapService.getMapInstance(),
  };
}