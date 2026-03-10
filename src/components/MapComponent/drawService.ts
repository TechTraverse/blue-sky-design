import { Effect as E, Context, Layer } from "effect"
import { TerraDraw, TerraDrawLineStringMode, TerraDrawPolygonMode, TerraDrawSelectMode } from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import type { Map as MapLibreMap } from "maplibre-gl";
import { MapService } from "./mapService";
import type { Subscription } from "rxjs";

// Mode name mapping for backwards compatibility with mapbox-gl-draw
const MODE_MAP: Record<string, string> = {
  'draw_line_string': 'linestring',
  'draw_polygon': 'polygon',
  'simple_select': 'select',
  // Also support direct terra-draw mode names
  'linestring': 'linestring',
  'polygon': 'polygon',
  'select': 'select',
};

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
export function createTerraDraw(map: MapLibreMap): TerraDrawWrapper {
  // Clean up any existing terra-draw sources (handles HMR/re-initialization)
  const terraDrawSources = ['td-polygon', 'td-linestring', 'td-point', 'td-select'];
  for (const sourceId of terraDrawSources) {
    if (map.getSource(sourceId)) {
      // Remove layers using this source first
      const layers = map.getStyle()?.layers || [];
      for (const layer of layers) {
        if ('source' in layer && layer.source === sourceId) {
          map.removeLayer(layer.id);
        }
      }
      map.removeSource(sourceId);
    }
  }

  const drawInstance = new TerraDraw({
    adapter: new TerraDrawMapLibreGLAdapter({
      map,
    }),
    modes: [
      new TerraDrawLineStringMode({
        // Finish after 2 points (single segment) for distance measurement
        finishOnNthCoordinate: 2,
      }),
      new TerraDrawPolygonMode(),
      new TerraDrawSelectMode({
        flags: {
          polygon: {
            feature: {
              draggable: false,
              coordinates: {
                deletable: false,
                midpoints: false,
                draggable: false,
              }
            }
          },
          linestring: {
            feature: {
              draggable: false,
              coordinates: {
                deletable: false,
                midpoints: false,
                draggable: false,
              }
            }
          }
        }
      }),
    ],
  });

  drawInstance.start();

  // Handle double-click to finish polygon drawing
  const handleDblClick = () => {
    if (drawInstance.getMode() === 'polygon') {
      drawInstance.setMode('select');
    }
  };
  map.on('dblclick', handleDblClick);

  let finishCleanup: (() => void) | null = null;

  return {
    instance: drawInstance,

    setMode: (mode: string) => {
      const terraMode = MODE_MAP[mode] || mode;
      drawInstance.setMode(terraMode);
    },

    clear: () => {
      drawInstance.clear();
    },

    addShape: (feature: GeoJSON.Feature) => {
      // Cast to any since terra-draw has stricter geometry types
      drawInstance.addFeatures([feature as never]);
    },

    getFeatures: () => {
      return drawInstance.getSnapshot();
    },

    onFinish: (callback: (e: DrawFinishEvent) => void) => {
      const handler = (id: string | number, context: { action: string; mode: string }) => {
        if (context.action === 'draw') {
          const snapshot = drawInstance.getSnapshot();
          const feature = snapshot.find(f => f.id === id);
          if (feature) {
            callback({ features: [feature] });
          }
        }
      };
      drawInstance.on('finish', handler);
      finishCleanup = () => drawInstance.off('finish', handler as never);
      return finishCleanup;
    },

    stop: () => {
      if (finishCleanup) {
        finishCleanup();
        finishCleanup = null;
      }
      map.off('dblclick', handleDblClick);
      drawInstance.stop();
    },
  };
}

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

class DrawControlWrapper {
  static #instance: TerraDraw | undefined;
  static #subscriptions: Map<string, Subscription> = new Map();
  static #eventCleanups: Map<string, () => void> = new Map();

  static async make(
    mapService: {
      registerEventHandler: (evt: string, cb: (e: unknown, map: MapLibreMap) => void) => E.Effect<Subscription>;
      getMapInstance: () => MapLibreMap;
    }
  ): Promise<TerraDraw> {
    if (this.#instance) {
      return this.#instance;
    }

    // Get map instance directly
    const mapInstance = mapService.getMapInstance();

    const drawInstance = new TerraDraw({
      adapter: new TerraDrawMapLibreGLAdapter({
        map: mapInstance,
      }),
      modes: [
        new TerraDrawLineStringMode(),
        new TerraDrawPolygonMode(),
        new TerraDrawSelectMode({
          flags: {
            polygon: {
              feature: {
                draggable: false,
                coordinates: {
                  deletable: false,
                  midpoints: false,
                  draggable: false,
                }
              }
            },
            linestring: {
              feature: {
                draggable: false,
                coordinates: {
                  deletable: false,
                  midpoints: false,
                  draggable: false,
                }
              }
            }
          }
        }),
      ],
    });

    drawInstance.start();
    this.#instance = drawInstance;

    return drawInstance;
  }

  static reset(): void {
    if (this.#instance) {
      this.#instance.stop();
      this.#instance = undefined;
    }
    this.#subscriptions.forEach(sub => sub.unsubscribe());
    this.#subscriptions.clear();
    this.#eventCleanups.forEach(cleanup => cleanup());
    this.#eventCleanups.clear();
  }

  static setSubscription(key: string, subscription: Subscription): void {
    this.#subscriptions.set(key, subscription);
  }

  static unsubscribe(key: string): void {
    const subscription = this.#subscriptions.get(key);
    if (subscription) {
      subscription.unsubscribe();
      this.#subscriptions.delete(key);
    }
  }

  static setEventCleanup(key: string, cleanup: () => void): void {
    // Clean up existing event first
    const existing = this.#eventCleanups.get(key);
    if (existing) {
      existing();
    }
    this.#eventCleanups.set(key, cleanup);
  }

  static cleanupEvent(key: string): void {
    const cleanup = this.#eventCleanups.get(key);
    if (cleanup) {
      cleanup();
      this.#eventCleanups.delete(key);
    }
  }
}

/**
 * Draw Service - Effect-TS service for map drawing functionality
 */
export class DrawService extends Context.Tag("DrawService")<
  DrawService, DrawServiceImpl
>() { }

/**
 * Create DrawService layer that depends on MapService
 */
export const createDrawServiceLayer = (MapServiceLayer: Layer.Layer<typeof MapService.Service, never, never>) => {
  const DrawServiceLive = Layer.effect(
    DrawService,
    E.gen(function* () {
      const mapService = yield* MapService;
      const drawInstance = yield* E.promise(() => DrawControlWrapper.make(mapService));

      return {
        getInstance: () => E.succeed(drawInstance),

        setMode: (mode: string) => E.sync(() => {
          const terraMode = MODE_MAP[mode] || mode;
          drawInstance.setMode(terraMode);
        }),

        clear: () => E.sync(() => {
          drawInstance.clear();
        }),

        addShape: (feature: GeoJSON.Feature) => E.sync(() => {
          // Cast to any since terra-draw has stricter geometry types
          drawInstance.addFeatures([feature as never]);
        }),

        getFeatures: () => E.sync(() => {
          return drawInstance.getSnapshot();
        }),

        onFinish: (callback: (e: DrawFinishEvent) => void) =>
          E.sync(() => {
            const handler = (id: string | number, context: { action: string; mode: string }) => {
              if (context.action === 'draw') {
                const snapshot = drawInstance.getSnapshot();
                const feature = snapshot.find(f => f.id === id);
                if (feature) {
                  callback({ features: [feature] });
                }
              }
            };
            drawInstance.on('finish', handler);
            DrawControlWrapper.setEventCleanup('finish', () => {
              drawInstance.off('finish', handler as never);
            });
          }),

        offFinish: () => E.sync(() => {
          DrawControlWrapper.cleanupEvent('finish');
        }),

        onMapClick: (callback: (e: unknown) => void) =>
          E.gen(function* () {
            // Register click handler for desktop
            const clickSubscription = yield* mapService.registerEventHandler('click', (e: unknown) => callback(e));
            DrawControlWrapper.setSubscription('mapclick', clickSubscription);

            // Register touchend handler for mobile
            const touchSubscription = yield* mapService.registerEventHandler('touchend', (e: unknown) => {
              // Only handle single-finger taps (not pinch-zoom end)
              const touchEvent = e as { originalEvent?: { touches?: TouchList; changedTouches?: TouchList; preventDefault?: () => void } };
              if (touchEvent.originalEvent?.touches?.length === 0 && touchEvent.originalEvent?.changedTouches?.length === 1) {
                touchEvent.originalEvent.preventDefault?.();
                callback(e);
              }
            });
            DrawControlWrapper.setSubscription('maptouch', touchSubscription);
          }),

        offMapClick: () => E.sync(() => {
          DrawControlWrapper.unsubscribe('mapclick');
          DrawControlWrapper.unsubscribe('maptouch');
        })
      };
    })
  );

  return Layer.provide(DrawServiceLive, MapServiceLayer);
};

// Re-export mode constants for convenience
export const DrawModes = {
  LINE: 'linestring',
  POLYGON: 'polygon',
  SELECT: 'select',
  // Mapbox-gl-draw compatible names
  DRAW_LINE_STRING: 'draw_line_string',
  DRAW_POLYGON: 'draw_polygon',
  SIMPLE_SELECT: 'simple_select',
} as const;
