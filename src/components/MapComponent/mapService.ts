import { Effect as E, Option as O, Context, Layer, Data as D } from "effect"
import maplibregl from "maplibre-gl";
import type { AddLayerObject, Map as MapLibreMap, MapLibreEvent, MapOptions, MapSourceDataEvent, GeoJSONSourceSpecification, RasterSourceSpecification, VectorSourceSpecification, SourceSpecification } from "maplibre-gl";
import { match, P } from "ts-pattern";
import { firstValueFrom, fromEvent, interval, raceWith, map, Observable, shareReplay, take, Subscription, takeUntil } from "rxjs";

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

// Types
export type MapSettings = {
  zoom?: number;
  center?: [number, number];
}

export type MapControlsConfig = {
  navigation?: boolean;
  fullscreen?: boolean;
  geolocate?: boolean;
  scale?: boolean;
  attribution?: boolean;
}

/**
 * Source properties
 */
export type SourcePropsType = D.TaggedEnum<{
  VectorTiles: VectorSourceSpecification & { tiles: string[], id: string };
  RasterTiles: RasterSourceSpecification & { tiles: string[], id: string };
  GeoJsonData: GeoJSONSourceSpecification & { data: string, id: string };
}>;

export const {
  VectorTiles,
  RasterTiles,
  GeoJsonData } = D.taggedEnum<SourcePropsType>();

export type SourceProps = SourceSpecification & {
  id: string;
}

/**
 * Layer attributes
 */
export type LayerVisibility = D.TaggedEnum<{
  LayerVisible: object;
  LayerHidden: { reasons: Set<string> };
  LayerDimmed: { reasons: Set<string> };
}>;

export const { LayerVisible, LayerHidden, LayerDimmed } = D.taggedEnum<LayerVisibility>();

export type LayerSelectability = D.TaggedEnum<{
  LayerSelectable: object;
  LayerUnselectable: { reasons: Set<string> };
}>;

export const { LayerSelectable, LayerUnselectable } = D.taggedEnum<LayerSelectability>();

export type LayerEnabledOptions = {
  visible: LayerVisibility;
  order: number;
}

export type LayerDisabledOptions = {
  selectable: LayerSelectability;
}

export type LayerEnabledState = D.TaggedEnum<{
  LayerEnabled: LayerEnabledOptions;
  LayerDisabled: LayerDisabledOptions;
}>;
export const { LayerEnabled, LayerDisabled } = D.taggedEnum<LayerEnabledState>();

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
export const {
  Basemap,
  Labels,
  LargeScaleVector,
  SmallScaleVector,
  LargeScaleImagery,
  SmallScaleImagery,
  CustomOrder } = D.taggedEnum<LayerType>();

export const BASEMAP_PREFIX = "BASEMAP-";
export const LABELS_PREFIX = "LABELS-";

export class MapClassWrapper {
  static #instance: MapClassWrapper | undefined;

  #map: MapLibreMap;
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

  // Track pending cleanup timeouts to cancel them if needed
  #pendingCleanups: Map<string, number>;

  /**
   * Event handling
   */
  #mapRemoved$: Observable<boolean>;

  // Callback for sourcedata events (can be set externally for marker registry, etc.)
  #onSourceDataLoaded?: (map: MapLibreMap) => void;

  constructor(m: MapLibreMap, initialBasemapUrl: string, controls?: MapControlsConfig) {
    this.#map = m;
    this.#loadedBasemapUrl = initialBasemapUrl;
    this.#pendingCleanups = new Map();

    // Add controls based on configuration
    const ctrlConfig = controls ?? { navigation: true, fullscreen: true, geolocate: true, scale: true };

    if (ctrlConfig.navigation !== false) {
      this.#map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    }
    // Only add fullscreen control on non-mobile (app is already fullscreen on mobile)
    if (ctrlConfig.fullscreen !== false && typeof window !== 'undefined' && window.innerWidth > 768) {
      this.#map.addControl(new maplibregl.FullscreenControl(), 'bottom-right');
    }
    if (ctrlConfig.geolocate !== false) {
      this.#map.addControl(new maplibregl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
      }), 'bottom-right');
    }
    if (ctrlConfig.scale !== false) {
      this.#map.addControl(new maplibregl.ScaleControl());
    }

    // Event handling initialization
    this.#mapRemoved$ = fromEvent(this.#map, "remove").pipe(
      map(() => true),
      take(1),
      shareReplay(1));

    // Register sourcedata event listener for external callbacks
    this.#map.on('sourcedata', (e) => {
      if (e.isSourceLoaded && this.#onSourceDataLoaded) {
        this.#onSourceDataLoaded(this.#map);
      }
    });
  }

  /**
   * Set callback for sourcedata loaded events (for marker registry, etc.)
   */
  setOnSourceDataLoaded = (callback: (map: MapLibreMap) => void) => {
    this.#onSourceDataLoaded = callback;
  }

  static resetInstance = () => {
    this.#instance = undefined;
  }

  static async make(
    basemapConfig: string | { style?: any; tileUrl?: string; tileSize?: number; attribution?: string; minZoom?: number; maxZoom?: number },
    mapSettings?: MapSettings,
    controls?: MapControlsConfig,
    containerId: string = "map"
  ) {
    if (this.#instance) {
      return this.#instance;
    }

    // Handle different basemap configuration types
    let style: any;
    let basemapUrl: string;

    if (typeof basemapConfig === 'string') {
      basemapUrl = basemapConfig;
      // Check if this is a tile URL template (contains {z}/{x}/{y}) or a style JSON URL
      const isTileUrlTemplate = basemapConfig.includes('{z}') && basemapConfig.includes('{x}') && basemapConfig.includes('{y}');

      if (isTileUrlTemplate) {
        // Raster tile URL template
        style = {
          version: 8,
          sources: {
            'raster-tiles': {
              type: 'raster',
              tiles: [basemapUrl],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors'
            }
          },
          layers: [
            {
              id: 'simple-tiles',
              type: 'raster',
              source: 'raster-tiles',
              minzoom: 0,
              maxzoom: 22
            }
          ]
        };
      } else {
        // Style JSON URL (e.g., ESRI basemap styles) - use directly
        style = basemapUrl;
      }
    } else if (basemapConfig.style) {
      // Full MapLibre style specification
      style = basemapConfig.style;
      basemapUrl = 'custom-style';
    } else if (basemapConfig.tileUrl) {
      // BasemapConfig with tileUrl
      basemapUrl = basemapConfig.tileUrl;
      style = {
        version: 8,
        sources: {
          'raster-tiles': {
            type: 'raster',
            tiles: [basemapUrl],
            tileSize: basemapConfig.tileSize || 256,
            attribution: basemapConfig.attribution || '© Map contributors'
          }
        },
        layers: [
          {
            id: 'simple-tiles',
            type: 'raster',
            source: 'raster-tiles',
            minzoom: basemapConfig.minZoom || 0,
            maxzoom: basemapConfig.maxZoom || 22
          }
        ]
      };
    } else {
      // Default to OSM
      basemapUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
      style = {
        version: 8,
        sources: {
          'raster-tiles': {
            type: 'raster',
            tiles: [basemapUrl],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'simple-tiles',
            type: 'raster',
            source: 'raster-tiles',
            minzoom: 0,
            maxzoom: 22
          }
        ]
      };
    }

    const m = new maplibregl.Map({
      container: containerId,
      style: style,
      // Center over USA
      center: [-98.583333, 39.833333],
      zoom: 4,
      ...(controls?.attribution === false ? { attributionControl: false } : {}),
      ...(mapSettings ?? {}),
    });

    const loadOrTimeout$ = fromEvent(m, "load").pipe(raceWith(interval(2000)))
    const loadedMap = await firstValueFrom(loadOrTimeout$.pipe(map(() => m)));
    this.#instance = new MapClassWrapper(loadedMap, basemapUrl, controls);

    return this.#instance;
  }

  updateMapOptions = (mapOptions: Pick<MapOptions, "zoom" | "center">) => {
    mapOptions.center && this.#map.setCenter(mapOptions.center);
    mapOptions.zoom && this.#map.setZoom(mapOptions.zoom);

    return E.succeed(undefined);
  }

  registerEventHandler = (evtName: string, f: (e: unknown, map: MapLibreMap) => void) =>
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
        resourceUrl: getParamaterizedUrl(resourceUrl, paramKeyVals),
      }))
      .with({ sourceConfig: { _tag: P.union("VectorTiles", "RasterTiles") } }, ({ sourceConfig, paramKeyVals }) => ({
        ...l,
        sourceConfig: {
          ...sourceConfig,
          tiles: sourceConfig.tiles.map((tilesUrl) => getParamaterizedUrl(tilesUrl, paramKeyVals))
        }
      }))
      .with({ sourceConfig: { _tag: "GeoJsonData" } }, ({ sourceConfig, paramKeyVals }) => ({
        ...l,
        sourceConfig: {
          ...sourceConfig,
          data: getParamaterizedUrl(sourceConfig.data, paramKeyVals)
        }
      }))
      .otherwise(() => l);

  #addLabelsLayer = (l: LayerType) => {
    const parameterizedLayer = this.#parameterizeLayerUrls(l);
    if (parameterizedLayer._tag !== "Labels") {
      return E.fail(new Error("addLabelsLayer called with non-labels layer"));
    }
    this.#map.setStyle(parameterizedLayer.resourceUrl, {
      transformStyle: (previousStyle, nextStyle) => {
        const taggedNextLayers = nextStyle.layers.map((l) => ({
          ...l,
          id: `${this.#labelsPrefix}${l.id}`
        })) as AddLayerObject[];

        return {
          ...nextStyle,
          sources: {
            ...previousStyle?.sources,
            ...nextStyle.sources,
          },
          layers: [
            ...(previousStyle?.layers ?? []),
            ...taggedNextLayers
          ]
        } as maplibregl.StyleSpecification;
      }
    })
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
      this.#map.setStyle(resourceUrl, {
        diff,
        validate,
        transformStyle: (previousStyle, nextStyle) => {
          cb(E.succeed(true));
          this.#loadedBasemapUrl = resourceUrl;
          const {
            sources: previousSources,
            layers: previousLayers
          } = previousStyle ?? { sources: {}, layers: [] };

          // Filter out old basemap layers by checking if their source uses basemap prefix
          const oldBasemapSources = new Set(
            Object.keys(previousSources).filter(sourceName =>
              sourceName.startsWith(this.#basemapPrefix) ||
              Object.keys(nextStyle.sources).includes(sourceName)
            )
          );

          // Create source mapping first so we can use it for layer updates
          const sourceMapping: { [oldName: string]: string } = {};
          const renamedSources: { [name: string]: maplibregl.SourceSpecification } = {};

          Object.entries(nextStyle.sources).forEach(([sourceName, sourceConfig]) => {
            const newSourceName = `${this.#basemapPrefix}${sourceName}`;
            sourceMapping[sourceName] = newSourceName;
            renamedSources[newSourceName] = sourceConfig;
          });

          // More aggressive filtering: Remove ALL layers that aren't explicitly common, labels, or draw layers
          const nonBasemapLayers = previousLayers.filter(layer => {
            return layer.id.startsWith(this.#labelsPrefix) ||
              layer.id.startsWith(this.#commonLayersPrefix) ||
              layer.id.includes('mapbox-gl-draw');
          }).map(layer => {
            const layerSource = 'source' in layer ? layer.source : undefined;

            // Update source references for labels layers that use old basemap sources
            if (layer.id.startsWith(this.#labelsPrefix) && layerSource && oldBasemapSources.has(layerSource)) {
              const newSourceName = sourceMapping[layerSource];
              if (newSourceName) {
                return {
                  ...layer,
                  source: newSourceName
                };
              }
            }

            return layer;
          });

          // Only remove sources that are NOT being used by any preserved layers
          const sourcesInUse = new Set(
            nonBasemapLayers
              .map(layer => 'source' in layer ? layer.source : undefined)
              .filter(Boolean)
          );

          const cleanedSources = { ...previousSources };

          // Remove old basemap sources only if they're not being used by preserved layers
          oldBasemapSources.forEach(sourceName => {
            if (!sourcesInUse.has(sourceName)) {
              delete cleanedSources[sourceName];
            }
          });

          // Remove MapboxDraw sources - let MapboxDraw re-initialize them
          const drawSources = ['mapbox-gl-draw-cold', 'mapbox-gl-draw-hot'];
          drawSources.forEach(drawSourceId => {
            delete cleanedSources[drawSourceId];
          });

          // Also ensure we don't accidentally include original basemap sources in the final sources
          Object.keys(nextStyle.sources).forEach(originalSourceName => {
            if (cleanedSources[originalSourceName] && !sourcesInUse.has(originalSourceName)) {
              delete cleanedSources[originalSourceName];
            }
          });

          // Prevent adding new basemap sources that conflict with existing MapboxDraw sources
          drawSources.forEach(drawSourceId => {
            if (nextStyle.sources[drawSourceId] && cleanedSources[drawSourceId]) {
              delete renamedSources[drawSourceId];
            }
          });

          // Update layer references to use renamed sources and add layer prefix
          const taggedNextLayers = nextStyle.layers.map((l) => ({
            ...l,
            id: `${this.#basemapPrefix}${l.id}`,
            source: sourceMapping[(l as maplibregl.LayerSpecification & { source: string }).source] || (l as maplibregl.LayerSpecification & { source: string }).source
          })) as AddLayerObject[];

          const finalStyle = {
            ...previousStyle,
            ...nextStyle,
            sources: {
              ...cleanedSources,
              ...renamedSources,
            },
            layers: [
              ...taggedNextLayers,
              ...nonBasemapLayers,
            ]
          } as maplibregl.StyleSpecification;

          // Validate that all layers have their sources available
          const finalSources = new Set(Object.keys(finalStyle.sources));
          finalStyle.layers.filter(layer => {
            const layerSource = 'source' in layer ? (layer.source as string) : undefined;
            return layerSource && !finalSources.has(layerSource);
          });

          return finalStyle;
        }
      })
    }).pipe(E.tap(boolCallbackCalled =>
      !boolCallbackCalled && this.#map.fire("style.load"))) as E.Effect<unknown, Error, void>;
  }

  #addBasemapLayer = (l: LayerType) => {
    if (l._tag !== "Basemap") {
      return E.fail(new Error("addBasemapLayer called with non-basemap layer"));
    }

    if (this.#map.isStyleLoaded()) {
      return this.#setStyleByResourceUrl(l.resourceUrl);
    } else {
      const loadEvent$ = fromEvent(this.#map, "style.load");
      return E.andThen(
        E.promise(() => firstValueFrom(loadEvent$.pipe(
          raceWith(interval(1000))))),
        E.flatMap(() => {
          return this.#setStyleByResourceUrl(l.resourceUrl, false, false);
        }))
    }
  }

  #addToTopOfCommonLayers = (l: LayerType) => {
    if (l._tag === "Labels" || l._tag === "Basemap") {
      return E.fail(new Error("addToTopOfCommonLayers called with non-common layer"));
    }
    // Add the source first before adding layers
    this.#mapAddSource(l.sourceConfig);

    const layers = this.#map.getStyle().layers;
    const uFirstLabelsLayer = layers.find((layer) => layer.id.startsWith(this.#labelsPrefix));
    this.#addLayerConfigs(l, uFirstLabelsLayer?.id);
    return E.succeed(undefined);
  }

  #getSnapshotOfCurrentMapLayers = (uLayerAbove: LayerType | undefined) => {
    const style = this.#map.getStyle();
    if (!style || !style.layers) {
      return {
        currentLayerNumber: 0,
        mFirstLabelsLayerId: O.none(),
        commonLayersPresent: false,
        basemapLayersPresent: false,
        mMaplibreLayerAbove: O.none()
      };
    }

    const { layers } = style;
    const currentLayerNumber = layers.length;
    const mFirstLabelsLayerId = O.fromNullable(layers.find(
      (l) => l.id.startsWith(this.#labelsPrefix))?.id);
    const commonLayersPresent = layers.some(
      (l) => l.id.startsWith(this.#commonLayersPrefix));
    const basemapLayersPresent = layers.some(
      (l) => l.id.startsWith(this.#basemapPrefix));

    const mMaplibreLayerAbove = O.fromNullable(uLayerAbove).pipe(
      O.flatMap((layerAbove) =>
        O.fromNullable(layers.find(
          (l) => l.id.startsWith(`${this.#commonLayersPrefix}${layerAbove.id}`))?.id))).pipe(
            O.orElse(() => mFirstLabelsLayerId)
          );

    return {
      currentLayerNumber,
      mFirstLabelsLayerId,
      commonLayersPresent,
      basemapLayersPresent,
      mMaplibreLayerAbove,
    }
  }

  #addLayerConfigs = (l: LayerResourceDescriptor, layerAboveId?: string) => {
    if (layerAboveId) {
      let lastId = layerAboveId;
      l.orderedLayerConfigs.forEach(x => {
        this.#mapAddLayer(x, lastId);
        lastId = `${this.#commonLayersPrefix}${x.id}`;
      });
    } else {
      // Each layer will be inserted below the labels layer. Reverse the order
      l.orderedLayerConfigs.slice().reverse().forEach(x => {
        this.#mapAddLayer(x)
      });
    }
  }

  addLayer = (l: LayerType, uLayerAbove?: LayerType | undefined) => {
    const parameterizedLayer = this.#parameterizeLayerUrls(l);
    const layerSnapshot = this.#getSnapshotOfCurrentMapLayers(uLayerAbove);
    return match([parameterizedLayer, layerSnapshot])
      .with([{ _tag: "Basemap" }, P._], ([x]) => this.#addBasemapLayer(x))
      .with([{ _tag: "Labels" }, P._], ([x]) => this.#addLabelsLayer(x))
      .with([{
        _tag: this.#nonBasemapLabelsLayersUnion,
        enabled: { _tag: "LayerEnabled" }
      }, { commonLayersPresent: false }], ([l]) => {
        this.#mapAddSource(l.sourceConfig);
        this.#addLayerConfigs(l);
        return E.succeed(undefined);
      })
      .with([P.select("l", {
        _tag: this.#nonBasemapLabelsLayersUnion,
        enabled: {
          _tag: "LayerEnabled"
        }
      }), {
        mMaplibreLayerAbove: { value: P.select("layerAbove") },
      }], ({ l, layerAbove }) => {
        this.#mapAddSource(l.sourceConfig);
        this.#addLayerConfigs(l, layerAbove);
        return E.succeed(undefined);
      })
      .with([P.select("l", {
        _tag: this.#nonBasemapLabelsLayersUnion,
        enabled: {
          _tag: "LayerEnabled"
        }
      }), { commonLayersPresent: true }], ({ l }) => this.#addToTopOfCommonLayers(l))
      .otherwise(() => E.fail(new Error("Unknown layer type"))) as E.Effect<undefined, Error, void>;
  }

  #rmLayerConfigs = (l: LayerResourceDescriptor, pred?: (l: maplibregl.LayerSpecification) => boolean) => {
    l.orderedLayerConfigs.forEach(x => {
      const layerIdWithPrefix = `${this.#commonLayersPrefix}${x.id}`;

      // Remove all layers that start with this prefix (handles buffered layers with _A/_B suffix)
      const allLayers = this.#map.getStyle().layers;
      allLayers.forEach(layer => {
        if (layer.id.startsWith(layerIdWithPrefix) && (pred ? pred(layer) : true)) {
          this.#map.removeLayer(layer.id);
        }
      });
    });
  }

  rmLayer = (l: LayerType) =>
    match(l)
      .with({ _tag: P.union("Basemap", "Labels") }, () => E.fail(new Error("Layer remove handling not implemented")))
      .otherwise((l) => {
        this.#rmLayerConfigs(l);

        // Remove all sources that start with this ID (handles buffered sources with _A/_B suffix)
        const allSources = this.#map.getStyle().sources;
        Object.keys(allSources).forEach(sourceId => {
          if (sourceId.startsWith(l.sourceConfig.id)) {
            this.#map.removeSource(sourceId);
          }
        });

        // Cancel any pending cleanup timeout for this source
        const pendingTimeoutId = this.#pendingCleanups.get(l.sourceConfig.id);
        if (pendingTimeoutId !== undefined) {
          clearTimeout(pendingTimeoutId);
          this.#pendingCleanups.delete(l.sourceConfig.id);
        }

        return E.succeed(undefined);
      });

  moveLayer = (l: LayerType, uLayerAbove: LayerType | undefined) => {
    const layerSnapshot = this.#getSnapshotOfCurrentMapLayers(uLayerAbove);
    match([l, layerSnapshot])
      .with([P.select("l", { _tag: P.union("Basemap", "Labels") }), P._], () => E.fail(new Error("Layer move handling not implemented")))
      .with([{ _tag: this.#nonBasemapLabelsLayersUnion }, P._],
        ([l, layerSnapshot]) => {
          const layerAbove = O.isSome(layerSnapshot.mMaplibreLayerAbove) ? layerSnapshot.mMaplibreLayerAbove.value : undefined;
          this.#mapAddSource(l.sourceConfig);
          l.orderedLayerConfigs.forEach((layerConfig) => {
            const layerIdWithPrefix = `${this.#commonLayersPrefix}${layerConfig.id}`;
            if (this.#map.getLayer(layerIdWithPrefix)) {
              this.#map.removeLayer(layerIdWithPrefix);
            }
          });
          let lastId = layerAbove;
          l.orderedLayerConfigs.forEach(x => {
            this.#mapAddLayer(x, lastId);
            const newLastId = `${this.#commonLayersPrefix}${x.id}`;
            lastId = newLastId;
          });

        })
      .otherwise((x) => console.error("Unknown layer type", x));
    return E.succeed(undefined);
  }

  #tileOrDataUpdate = (l: LayerType) => {
    return match(this.#parameterizeLayerUrls(l))
      .with({
        sourceConfig: P.select({
          _tag: "GeoJsonData",
        })
      }, (sourceConfig) => {
        const uSource = this.#map.getSource(sourceConfig.id);
        if (uSource) {
          (uSource as maplibregl.GeoJSONSource).setData(sourceConfig.data);
          return E.succeed(undefined);
        } else {
          return this.addLayer(l);
        }
      })
      .with({
        sourceConfig: P.select({
          _tag: "RasterTiles",
        })
      }, (sourceConfig) => {
        const uSource = this.#map.getSource(sourceConfig.id);
        if (uSource) {
          // Raster tiles work fine with setTiles()
          (uSource as maplibregl.RasterTileSource).setTiles(sourceConfig.tiles);
          return E.succeed(undefined);
        } else {
          return this.addLayer(l);
        }
      })
      .with({
        _tag: this.#nonBasemapLabelsLayersUnion,
        sourceConfig: P.select({
          _tag: "VectorTiles",
        })
      }, (sourceConfig, parameterizedLayer) => {
        const randomSuffix = Math.random().toString(36).slice(2);
        const newSourceId = `${sourceConfig.id}_${randomSuffix}`;

        // Listen for source data load event
        const onSourceData = (e: MapSourceDataEvent) => {
          if (e.sourceId === newSourceId && e.isSourceLoaded) {
            // Remove old layers
              // = 
            this.#rmLayerConfigs(sourceConfig, (l: maplibregl.LayerSpecification) => !l.id.endsWith(randomSuffix))

            const oldSourceId = <something>;

            // Remove old source
            if (this.#map.getSource(oldSourceId)) {
              this.#map.removeSource(oldSourceId);
            }

            this.#map.off('sourcedata', onSourceData);
          }
        };
        this.#map.on('sourcedata', onSourceData);


        // Add new source with next buffer using parameterized tiles
        this.#map.addSource(newSourceId, this.#cleanSourceConfig({
          ...sourceConfig,
          id: newSourceId
        }));

        // Add new layers pointing to next buffer
        const layers = this.#map.getStyle().layers;
        const uFirstLabelsLayer = layers.find((layer) => layer.id.startsWith(this.#labelsPrefix));

        parameterizedLayer.orderedLayerConfigs.slice().reverse().forEach(layerConfig => {
          const newLayerId = `${this.#commonLayersPrefix}${layerConfig.id}_${newSourceId}`;
          this.#map.addLayer({
            ...layerConfig,
            id: newLayerId,
            source: newSourceId
          } as AddLayerObject, uFirstLabelsLayer?.id);
        });

        return E.succeed(undefined);
      })
      .otherwise(() => E.fail(new Error("Unknown layer type")));
  }

  updateSourceParams = (layers: LayerType[]) =>
    // Reversing because layers are sent in L to R = Top to Bottom order
    // Which is the opposite of how they need to be updated
    E.mergeAll(layers.slice().reverse().map((layer) =>
      match(layer)
        .with({ _tag: P.union("Basemap", "Labels") }, () => E.fail(new Error("Basemap and Labels layers are not supported for updateSourceParams")))
        .with({ sourceConfig: { _tag: P.union("VectorTiles", "RasterTiles", "GeoJsonData") } }, x => this.#tileOrDataUpdate(x))
        .otherwise(() => E.fail(new Error("Unknown layer type")))),
      undefined, () => undefined);


  log = () => {
    console.log("MapService: Map instance", this.#map);
    return E.succeed(undefined);
  }

  getMapInstance = () => this.#map;
}

// Service implementation type (for use in adapters)
export type MapServiceImpl = {
  addLayer: (l: LayerType, uLayerAbove?: LayerType | undefined) => E.Effect<undefined, Error, void>
  rmLayer: (l: LayerType) => E.Effect<void, Error, void>
  moveLayer: (l: LayerType, uLayerAbove: LayerType | undefined) => E.Effect<undefined, Error, never>
  updateSourceParams: (layers: LayerType[]) => E.Effect<undefined, Error, void>
  updateMapOptions: (mapOptions: Pick<MapOptions, "zoom" | "center">) => E.Effect<void, Error, void>
  registerEventHandler: (evtName: string, f: (e: unknown, map: MapLibreMap) => void) => E.Effect<Subscription>
  log: () => E.Effect<void>
  getMapInstance: () => MapLibreMap
  setOnSourceDataLoaded: (callback: (map: MapLibreMap) => void) => void
}

export class MapService extends Context.Tag("MapService")<
  MapService, MapServiceImpl
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
      moveLayer: mapWrapper.moveLayer,
      updateSourceParams: mapWrapper.updateSourceParams,
      updateMapOptions: mapWrapper.updateMapOptions,
      registerEventHandler: mapWrapper.registerEventHandler,
      log: mapWrapper.log,
      getMapInstance: mapWrapper.getMapInstance,
      setOnSourceDataLoaded: mapWrapper.setOnSourceDataLoaded,
    };
  }),
);

export const MapServiceLayer = MapServiceLive;
