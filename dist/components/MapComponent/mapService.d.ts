import { Effect as E, Context, Layer, Data as D } from 'effect';
import { default as maplibregl, AddLayerObject, Map as MapLibreMap, MapOptions, GeoJSONSourceSpecification, RasterSourceSpecification, VectorSourceSpecification, SourceSpecification, StyleSpecification } from 'maplibre-gl';
import { Subscription } from 'rxjs';
import { BasemapFallbackOptions } from './types';
/**
 * Creates a MapLibre style with a solid background color and no external dependencies.
 * Used as the final fallback when basemap loading fails.
 */
export declare const createSolidColorStyle: (backgroundColor?: string) => StyleSpecification;
export declare const getParamaterizedUrl: (baseUrl: string, paramsObj?: {
    [k: string]: unknown;
}) => string;
export type MapSettings = {
    zoom?: number;
    center?: [number, number];
};
export type MapControlsConfig = {
    navigation?: boolean;
    fullscreen?: boolean;
    geolocate?: boolean;
    scale?: boolean;
    attribution?: boolean;
};
/**
 * Source properties
 */
export type SourcePropsType = D.TaggedEnum<{
    VectorTiles: VectorSourceSpecification & {
        tiles: string[];
        id: string;
    };
    RasterTiles: RasterSourceSpecification & {
        tiles: string[];
        id: string;
    };
    GeoJsonData: GeoJSONSourceSpecification & {
        data: string;
        id: string;
    };
}>;
export declare const VectorTiles: D.Case.Constructor<{
    readonly _tag: "VectorTiles";
    readonly type: "vector";
    readonly url?: string | undefined;
    readonly tiles: Array<string>;
    readonly bounds?: [number, number, number, number] | undefined;
    readonly scheme?: "xyz" | "tms" | undefined;
    readonly minzoom?: number | undefined;
    readonly maxzoom?: number | undefined;
    readonly attribution?: string | undefined;
    readonly promoteId?: maplibregl.PromoteIdSpecification | undefined;
    readonly volatile?: boolean | undefined;
    readonly encoding?: "mvt" | "mlt" | undefined;
    readonly id: string;
}, "_tag">, RasterTiles: D.Case.Constructor<{
    readonly _tag: "RasterTiles";
    readonly type: "raster";
    readonly url?: string | undefined;
    readonly tiles: Array<string>;
    readonly bounds?: [number, number, number, number] | undefined;
    readonly minzoom?: number | undefined;
    readonly maxzoom?: number | undefined;
    readonly tileSize?: number | undefined;
    readonly scheme?: "xyz" | "tms" | undefined;
    readonly attribution?: string | undefined;
    readonly volatile?: boolean | undefined;
    readonly id: string;
}, "_tag">, GeoJsonData: D.Case.Constructor<{
    readonly _tag: "GeoJsonData";
    readonly type: "geojson";
    readonly data: (string | import('geojson').GeoJSON<import('geojson').Geometry, import('geojson').GeoJsonProperties>) & string;
    readonly maxzoom?: number | undefined;
    readonly attribution?: string | undefined;
    readonly buffer?: number | undefined;
    readonly filter?: unknown;
    readonly tolerance?: number | undefined;
    readonly cluster?: boolean | undefined;
    readonly clusterRadius?: number | undefined;
    readonly clusterMaxZoom?: number | undefined;
    readonly clusterMinPoints?: number | undefined;
    readonly clusterProperties?: unknown;
    readonly lineMetrics?: boolean | undefined;
    readonly generateId?: boolean | undefined;
    readonly promoteId?: maplibregl.PromoteIdSpecification | undefined;
    readonly id: string;
}, "_tag">;
export type SourceProps = SourceSpecification & {
    id: string;
};
/**
 * Layer attributes
 */
export type LayerVisibility = D.TaggedEnum<{
    LayerVisible: object;
    LayerHidden: {
        reasons: Set<string>;
    };
    LayerDimmed: {
        reasons: Set<string>;
    };
}>;
export declare const LayerVisible: D.Case.Constructor<{
    readonly _tag: "LayerVisible";
}, "_tag">, LayerHidden: D.Case.Constructor<{
    readonly _tag: "LayerHidden";
    readonly reasons: Set<string>;
}, "_tag">, LayerDimmed: D.Case.Constructor<{
    readonly _tag: "LayerDimmed";
    readonly reasons: Set<string>;
}, "_tag">;
export type LayerSelectability = D.TaggedEnum<{
    LayerSelectable: object;
    LayerUnselectable: {
        reasons: Set<string>;
    };
}>;
export declare const LayerSelectable: D.Case.Constructor<{
    readonly _tag: "LayerSelectable";
}, "_tag">, LayerUnselectable: D.Case.Constructor<{
    readonly _tag: "LayerUnselectable";
    readonly reasons: Set<string>;
}, "_tag">;
export type LayerEnabledOptions = {
    visible: LayerVisibility;
    order: number;
};
export type LayerDisabledOptions = {
    selectable: LayerSelectability;
};
export type LayerEnabledState = D.TaggedEnum<{
    LayerEnabled: LayerEnabledOptions;
    LayerDisabled: LayerDisabledOptions;
}>;
export declare const LayerEnabled: D.Case.Constructor<{
    readonly _tag: "LayerEnabled";
    readonly visible: LayerVisibility;
    readonly order: number;
}, "_tag">, LayerDisabled: D.Case.Constructor<{
    readonly _tag: "LayerDisabled";
    readonly selectable: LayerSelectability;
}, "_tag">;
/**
 * Layer resource descriptor (for data layers)
 */
export interface LayerResourceDescriptor {
    readonly id: string;
    readonly humanReadableName: string;
    readonly sourceConfig: SourcePropsType;
    readonly orderedLayerConfigs: AddLayerObject[];
    paramKeyVals: Record<string, string>;
    enabled: LayerEnabledState;
}
/**
 * External style (for basemaps/labels)
 */
export interface ExtStyle {
    id: string;
    humanReadableName: string;
    resourceUrl: string;
    paramKeyVals: Record<string, string>;
    enabled: LayerEnabledState;
}
/**
 * Layer type discriminated union
 */
export type LayerType = D.TaggedEnum<{
    Basemap: ExtStyle;
    Labels: ExtStyle;
    LargeScaleVector: LayerResourceDescriptor;
    SmallScaleVector: LayerResourceDescriptor;
    LargeScaleImagery: LayerResourceDescriptor;
    SmallScaleImagery: LayerResourceDescriptor;
    CustomOrder: LayerResourceDescriptor;
}>;
export declare const Basemap: D.Case.Constructor<{
    readonly _tag: "Basemap";
    readonly id: string;
    readonly humanReadableName: string;
    readonly resourceUrl: string;
    readonly paramKeyVals: Record<string, string>;
    readonly enabled: LayerEnabledState;
}, "_tag">, Labels: D.Case.Constructor<{
    readonly _tag: "Labels";
    readonly id: string;
    readonly humanReadableName: string;
    readonly resourceUrl: string;
    readonly paramKeyVals: Record<string, string>;
    readonly enabled: LayerEnabledState;
}, "_tag">, LargeScaleVector: D.Case.Constructor<{
    readonly _tag: "LargeScaleVector";
    readonly id: string;
    readonly humanReadableName: string;
    readonly sourceConfig: SourcePropsType;
    readonly orderedLayerConfigs: AddLayerObject[];
    readonly paramKeyVals: Record<string, string>;
    readonly enabled: LayerEnabledState;
}, "_tag">, SmallScaleVector: D.Case.Constructor<{
    readonly _tag: "SmallScaleVector";
    readonly id: string;
    readonly humanReadableName: string;
    readonly sourceConfig: SourcePropsType;
    readonly orderedLayerConfigs: AddLayerObject[];
    readonly paramKeyVals: Record<string, string>;
    readonly enabled: LayerEnabledState;
}, "_tag">, LargeScaleImagery: D.Case.Constructor<{
    readonly _tag: "LargeScaleImagery";
    readonly id: string;
    readonly humanReadableName: string;
    readonly sourceConfig: SourcePropsType;
    readonly orderedLayerConfigs: AddLayerObject[];
    readonly paramKeyVals: Record<string, string>;
    readonly enabled: LayerEnabledState;
}, "_tag">, SmallScaleImagery: D.Case.Constructor<{
    readonly _tag: "SmallScaleImagery";
    readonly id: string;
    readonly humanReadableName: string;
    readonly sourceConfig: SourcePropsType;
    readonly orderedLayerConfigs: AddLayerObject[];
    readonly paramKeyVals: Record<string, string>;
    readonly enabled: LayerEnabledState;
}, "_tag">, CustomOrder: D.Case.Constructor<{
    readonly _tag: "CustomOrder";
    readonly id: string;
    readonly humanReadableName: string;
    readonly sourceConfig: SourcePropsType;
    readonly orderedLayerConfigs: AddLayerObject[];
    readonly paramKeyVals: Record<string, string>;
    readonly enabled: LayerEnabledState;
}, "_tag">;
export declare const BASEMAP_PREFIX = "BASEMAP-";
export declare const LABELS_PREFIX = "LABELS-";
export declare class MapClassWrapper {
    #private;
    constructor(m: MapLibreMap, initialBasemapUrl: string, controls?: MapControlsConfig);
    /**
     * Set callback for sourcedata loaded events (for marker registry, etc.)
     */
    setOnSourceDataLoaded: (callback: (map: MapLibreMap) => void) => void;
    static resetInstance: () => void;
    static make(basemapConfig: string | {
        style?: any;
        tileUrl?: string;
        tileSize?: number;
        attribution?: string;
        minZoom?: number;
        maxZoom?: number;
    }, mapSettings?: MapSettings, controls?: MapControlsConfig, containerId?: string, fallbackOptions?: BasemapFallbackOptions): Promise<MapClassWrapper>;
    updateMapOptions: (mapOptions: Pick<MapOptions, "zoom" | "center">) => E.Effect<undefined, never, never>;
    registerEventHandler: (evtName: string, f: (e: unknown, map: MapLibreMap) => void) => E.Effect<Subscription, never, never>;
    addLayer: (l: LayerType, uLayerAbove?: LayerType | undefined) => E.Effect<undefined, Error, void>;
    rmLayer: (l: LayerType) => E.Effect<never, Error, never> | E.Effect<undefined, never, never>;
    moveLayer: (l: LayerType, uLayerAbove: LayerType | undefined) => E.Effect<undefined, never, never>;
    updateSourceParams: (layers: LayerType[]) => E.Effect<undefined, Error, void>;
    log: () => E.Effect<undefined, never, never>;
    getMapInstance: () => maplibregl.Map;
}
export type MapServiceImpl = {
    addLayer: (l: LayerType, uLayerAbove?: LayerType | undefined) => E.Effect<undefined, Error, void>;
    rmLayer: (l: LayerType) => E.Effect<void, Error, void>;
    moveLayer: (l: LayerType, uLayerAbove: LayerType | undefined) => E.Effect<undefined, Error, never>;
    updateSourceParams: (layers: LayerType[]) => E.Effect<undefined, Error, void>;
    updateMapOptions: (mapOptions: Pick<MapOptions, "zoom" | "center">) => E.Effect<void, Error, void>;
    registerEventHandler: (evtName: string, f: (e: unknown, map: MapLibreMap) => void) => E.Effect<Subscription>;
    log: () => E.Effect<void>;
    getMapInstance: () => MapLibreMap;
    setOnSourceDataLoaded: (callback: (map: MapLibreMap) => void) => void;
};
declare const MapService_base: Context.TagClass<MapService, "MapService", MapServiceImpl>;
export declare class MapService extends MapService_base {
}
export declare const MapServiceLayer: Layer.Layer<MapService, never, never>;
export {};
