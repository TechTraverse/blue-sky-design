import { Effect as E, Option as O, Context, Layer } from "effect"
import maplibregl, { AddLayerObject, Map, MapLibreEvent, MapOptions } from "maplibre-gl";
import { match, P } from "ts-pattern";
import { firstValueFrom, fromEvent, interval, raceWith, map, Observable, shareReplay, take, Subscription, takeUntil } from "rxjs";
import _ from "lodash";

// Service utilities
const objectToParams = (x: { [k: string]: unknown }) => {
  return Object.keys(x)
    .filter((key) => x[key] !== undefined)
    .filter((key) => key !== "_tag")
    .map((key) => key + "=" + x[key])
    .join("&");
};

export const getParamaterizedUrl = (
  baseUrl: string,
  paramsObj?: { [k: string]: unknown }
) => (paramsObj && Object.keys(paramsObj).length > 0)
    ? `${baseUrl.split("?")[0]}?${objectToParams(paramsObj)}`
    : baseUrl;

// Types (minimal subset needed for MapService)
export type MapSettings = {
  zoom?: number;
  center?: [number, number];
}

export type SourceProps = {
  id: string;
  type: string;
  tiles?: string[];
  data?: string;
  [key: string]: any;
}

export type LayerType = {
  _tag: string;
  id: string;
  resourceUrl?: string;
  paramKeyVals?: { [key: string]: unknown };
  sourceConfig?: SourceProps;
  orderedLayerConfigs?: AddLayerObject[];
  enabled?: any;
}

export const BASEMAP_PREFIX = "BASEMAP-";
export const LABELS_PREFIX = "LABELS-";

class MapClassWrapper {
  static #instance: MapClassWrapper | undefined;

  #map: Map;
  #loadedBasemapUrl: string | undefined;
  #basemapPrefix: string = BASEMAP_PREFIX;
  #labelsPrefix: string = LABELS_PREFIX;

  // Export layer prefixes for filtering
  #commonLayersPrefix: string = "COMMON-";
  #nonBasemapLabelsLayersUnion = P.union(
    "SmallScaleVector",
    "LargeScaleVector",
    "SmallScaleImagery",
    "LargeScaleImagery",
    "CustomOrder");

  /**
   * Event handling
   */
  #mapRemoved$: Observable<boolean>;

  /**
   * Default subscriptions
   */

  constructor(m: Map, initialBasemapUrl: string) {
    this.#map = m;
    this.#loadedBasemapUrl = initialBasemapUrl;

    // Add navigation controls
    this.#map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    this.#map.addControl(new maplibregl.FullscreenControl(), 'bottom-right');
    this.#map.addControl(new maplibregl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true,
      showUserHeading: true
    }), 'bottom-right');
    this.#map.addControl(new maplibregl.ScaleControl());

    // Event handling initialization
    this.#mapRemoved$ = fromEvent(this.#map, "remove").pipe(
      map(() => true),
      take(1),
      shareReplay(1));
  }

  static async make(basemapUrl: string, mapSettings?: MapSettings) {
    if (this.#instance) {
      return this.#instance;
    }
    const m = new maplibregl.Map({
      container: "map",
      style: basemapUrl,
      // Center over USA
      center: [-98.583333, 39.833333],
      zoom: 4,
      ...(mapSettings ?? {}),
    });

    const loadOrTimeout$ = fromEvent(m, "load").pipe(raceWith(interval(2000)))
    const loadedMap = await firstValueFrom(loadOrTimeout$.pipe(map(() => m)));
    this.#instance = new MapClassWrapper(loadedMap, basemapUrl);

    return this.#instance;
  }

  updateMapOptions = (mapOptions: Pick<MapOptions, "zoom" | "center">) => {
    mapOptions.center && this.#map.setCenter(mapOptions.center);
    mapOptions.zoom && this.#map.setZoom(mapOptions.zoom);

    return E.succeed(undefined);
  }

  registerEventHandler = (evtName: string, f: (e: unknown, map: Map) => void) =>
    E.succeed(
      fromEvent(this.#map, evtName).pipe(
        takeUntil(this.#mapRemoved$))
        .subscribe((e: MapLibreEvent) => {
          f(e, this.#map);
        }));

  #cleanSourceConfig = (sourceConfig: SourceProps) =>
    // Remove any internal tags
    Object.fromEntries(Object.entries(sourceConfig).filter(([k]) => !k.startsWith("_") && k !== "id")) as SourceProps;

  #mapAddSource = (sourceConfig: SourceProps) => {
    const possibleSource = this.#map.getSource(sourceConfig.id);
    if (!possibleSource) {
      this.#map.addSource(sourceConfig.id, {
        ...this.#cleanSourceConfig(sourceConfig),
        // "promoteId": "id"
      });
    }
    return this.#map.getSource(sourceConfig.id);
  }

  #mapAddLayer = (layerConfig: AddLayerObject, layerAbove?: string) => {
    const newId = `${this.#commonLayersPrefix}${layerConfig.id}`;
    if (!this.#map.getLayer(newId)) {
      let _layerAbove = layerAbove;
      if (!layerAbove) {
        const layers = this.#map.getStyle().layers;
        const labelsLayer = layers.find((layer) => layer?.id.startsWith(this.#labelsPrefix));
        _layerAbove = labelsLayer ? labelsLayer.id : undefined;
      }
      this.#map.addLayer({ ...layerConfig, id: newId }, _layerAbove);
    }
    return this.#map.getLayer(layerConfig.id);
  };

  #parameterizeLayerUrls = (l: LayerType) =>
    match(l)
      .with({ _tag: P.union("Labels", "Basemap") }, ({ resourceUrl, paramKeyVals }) => ({
        ...l,
        resourceUrl: getParamaterizedUrl(resourceUrl!, paramKeyVals),
      }))
      .with({ sourceConfig: { _tag: P.union("VectorTiles", "RasterTiles") } }, ({ sourceConfig, paramKeyVals }) => ({
        ...l,
        sourceConfig: {
          ...sourceConfig,
          tiles: sourceConfig.tiles!.map((tilesUrl) => getParamaterizedUrl(tilesUrl, paramKeyVals))
        }
      }))
      .with({ sourceConfig: { _tag: "GeoJsonData" } }, ({ sourceConfig, paramKeyVals }) => ({
        ...l,
        sourceConfig: {
          ...sourceConfig,
          data: getParamaterizedUrl(sourceConfig.data!, paramKeyVals)
        }
      }))
      .otherwise(() => l);

  addLayer = (l: LayerType, uLayerAbove?: LayerType | undefined) => {
    // Simplified version - basic layer addition
    const parameterizedLayer = this.#parameterizeLayerUrls(l);
    
    if (parameterizedLayer._tag === "Basemap") {
      return this.#setStyleByResourceUrl(parameterizedLayer.resourceUrl!);
    }
    
    if (parameterizedLayer.sourceConfig) {
      this.#mapAddSource(parameterizedLayer.sourceConfig);
      if (parameterizedLayer.orderedLayerConfigs) {
        parameterizedLayer.orderedLayerConfigs.forEach(config => {
          this.#mapAddLayer(config);
        });
      }
    }
    
    return E.succeed(undefined);
  }

  #setStyleByResourceUrl = (resourceUrl: string, diff: boolean = true, validate: boolean = true) => {
    if (resourceUrl === this.#loadedBasemapUrl) {
      console.warn("Duplicate resource url detected, skipping style update");
      return E.succeed(undefined);
    }

    return E.async((cb) => {
      // Timeout
      setTimeout(() => {
        cb(E.succeed(false));
      }, 1000);
      this.#map.setStyle(resourceUrl, { diff, validate });
      this.#loadedBasemapUrl = resourceUrl;
      cb(E.succeed(true));
    }).pipe(E.tap(boolCallbackCalled =>
      !boolCallbackCalled && this.#map.fire("style.load"))) as E.Effect<unknown, Error, void>;
  }

  rmLayer = (l: LayerType) => {
    if (l.orderedLayerConfigs) {
      l.orderedLayerConfigs.forEach(x => {
        const layerIdWithPrefix = `${this.#commonLayersPrefix}${x.id}`;
        if (this.#map.getLayer(layerIdWithPrefix)) {
          this.#map.removeLayer(layerIdWithPrefix);
        }
      });
    }
    
    if (l.sourceConfig) {
      const possibleSource = this.#map.getSource(l.sourceConfig.id);
      if (possibleSource) {
        this.#map.removeSource(l.sourceConfig.id);
      }
    }
    
    return E.succeed(undefined);
  }

  log = () => {
    console.log("MapService: Map instance", this.#map);
    return E.succeed(undefined);
  }

  getMapInstance = () => this.#map;
}

export class MapService extends Context.Tag("MapService")<
  MapService, {
    addLayer: (l: LayerType, uLayerAbove?: LayerType | undefined) => E.Effect<undefined, Error, void>
    rmLayer: (l: LayerType) => E.Effect<void, Error, void>
    updateMapOptions: (mapOptions: Pick<MapOptions, "zoom" | "center">) => E.Effect<void, Error, void>
    registerEventHandler: (evtName: string, f: (e: unknown, map: Map) => void) => E.Effect<Subscription>
    log: () => E.Effect<void>
    getMapInstance: () => Map
  }
>() { }

const MapServiceLive = Layer.effect(
  MapService,
  E.gen(function* () {
    // Default basemap URL - OpenStreetMap (no API key required, CORS-friendly)
    const defaultBasemapUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
    
    const mapWrapper = yield* E.promise(() => MapClassWrapper.make(defaultBasemapUrl));
    
    return {
      addLayer: mapWrapper.addLayer,
      rmLayer: mapWrapper.rmLayer,
      updateMapOptions: mapWrapper.updateMapOptions,
      registerEventHandler: mapWrapper.registerEventHandler,
      log: mapWrapper.log,
      getMapInstance: mapWrapper.getMapInstance,
    };
  }),
);

export const MapServiceLayer = MapServiceLive;