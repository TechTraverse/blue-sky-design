import { Effect as E, Context, Layer } from 'effect';
import { TerraDraw } from 'terra-draw';
import { Map as MapLibreMap } from 'maplibre-gl';
import { MapService } from './mapService';
/**
 * Draw service types
 */
export interface DrawFinishEvent {
    features: GeoJSON.Feature[];
}
/**
 * Plain TerraDraw wrapper interface - no Effect dependency
 * This is the low-level API for consumers who manage their own Effect services
 */
export interface TerraDrawWrapper {
    /** The underlying TerraDraw instance */
    instance: TerraDraw;
    /** Set the drawing mode (supports both mapbox-gl-draw and terra-draw mode names) */
    setMode: (mode: string) => void;
    /** Clear all drawn shapes */
    clear: () => void;
    /** Add a shape to the map */
    addShape: (feature: GeoJSON.Feature) => void;
    /** Get all drawn features */
    getFeatures: () => GeoJSON.Feature[];
    /** Register callback for when drawing is finished */
    onFinish: (callback: (e: DrawFinishEvent) => void) => () => void;
    /** Stop the draw control and clean up */
    stop: () => void;
}
/**
 * Create a TerraDraw instance for the given map.
 * This is the low-level factory function that bundles terra-draw.
 * Consumers can use this to create their own Effect services without
 * dealing with bundler issues.
 */
export declare function createTerraDraw(map: MapLibreMap): TerraDrawWrapper;
export interface DrawServiceImpl {
    /** Get the underlying TerraDraw instance */
    getInstance: () => E.Effect<TerraDraw>;
    /** Set the drawing mode */
    setMode: (mode: string) => E.Effect<void>;
    /** Clear all drawn shapes */
    clear: () => E.Effect<void>;
    /** Add a shape to the map */
    addShape: (feature: GeoJSON.Feature) => E.Effect<void>;
    /** Get all drawn features */
    getFeatures: () => E.Effect<GeoJSON.Feature[]>;
    /** Register callback for when drawing is finished */
    onFinish: (callback: (e: DrawFinishEvent) => void) => E.Effect<void>;
    /** Unregister finish callback */
    offFinish: () => E.Effect<void>;
    /** Register callback for map clicks */
    onMapClick: (callback: (e: unknown) => void) => E.Effect<void>;
    /** Unregister map click callback */
    offMapClick: () => E.Effect<void>;
}
declare const DrawService_base: Context.TagClass<DrawService, "DrawService", DrawServiceImpl>;
/**
 * Draw Service - Effect-TS service for map drawing functionality
 */
export declare class DrawService extends DrawService_base {
}
/**
 * Create DrawService layer that depends on MapService
 */
export declare const createDrawServiceLayer: (MapServiceLayer: Layer.Layer<typeof MapService.Service, never, never>) => Layer.Layer<DrawService, never, MapService>;
export declare const DrawModes: {
    readonly LINE: "linestring";
    readonly POLYGON: "polygon";
    readonly SELECT: "select";
    readonly DRAW_LINE_STRING: "draw_line_string";
    readonly DRAW_POLYGON: "draw_polygon";
    readonly SIMPLE_SELECT: "simple_select";
};
export {};
