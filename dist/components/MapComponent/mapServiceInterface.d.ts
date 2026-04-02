import { Effect as E } from 'effect';
import { LayerType, MapServiceImpl } from './mapService';
import { Layer, MapOperations, MapEvent, BasemapConfig } from './types';
import { MapGeoJSONFeature, Map as MapLibreMap } from 'maplibre-gl';
export declare function convertLayerType(layer: LayerType): Layer;
export declare function convertToLayerType(layer: Layer): LayerType;
export declare class MapServiceAdapter implements MapOperations {
    private mapService;
    constructor(mapService: MapServiceImpl);
    addLayer(layer: Layer, above?: string): Promise<void>;
    removeLayer(layerId: string): Promise<void>;
    updateLayer(layer: Layer): Promise<void>;
    setBasemap(basemapConfig: string | BasemapConfig): Promise<void>;
    zoomTo(bounds: [number, number, number, number]): Promise<void>;
    flyTo(options: {
        center: [number, number];
        zoom: number;
    }): Promise<void>;
    queryRenderedFeatures(point?: {
        x: number;
        y: number;
    }): Promise<MapGeoJSONFeature[]>;
    getSource(sourceId: string): ReturnType<MapLibreMap['getSource']>;
    getLayer(layerId: string): ReturnType<MapLibreMap['getLayer']>;
    registerEventHandler(eventName: string, handler: (event: MapEvent) => void): Promise<() => void>;
    getMapInstance(): MapLibreMap;
}
export interface MapServiceEffect {
    service: MapServiceImpl;
    addLayerEffect: (layer: LayerType) => E.Effect<void, Error, void>;
    removeLayerEffect: (layer: LayerType) => E.Effect<void, Error, void>;
    updateMapOptionsEffect: (options: {
        zoom?: number;
        center?: [number, number];
    }) => E.Effect<void, Error, void>;
    registerEventHandlerEffect: (eventName: string, handler: (e: unknown, map: MapLibreMap) => void) => E.Effect<{
        unsubscribe: () => void;
    }>;
    getMapInstance: () => MapLibreMap;
}
export declare function createMapServiceEffect(mapService: MapServiceImpl): MapServiceEffect;
