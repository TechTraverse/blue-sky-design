import { Effect as E, Context, Layer } from "effect"
import { TerraDraw, TerraDrawLineStringMode, TerraDrawPolygonMode, TerraDrawSelectMode } from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import maplibregl from "maplibre-gl";
import type { Map as MapLibreMap } from "maplibre-gl";
import { MapService } from "./mapService";
import { Subscription } from "rxjs";

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
        lib: maplibregl,
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

  static reset() {
    if (this.#instance) {
      this.#instance.stop();
      this.#instance = undefined;
    }
    this.#subscriptions.forEach(sub => sub.unsubscribe());
    this.#subscriptions.clear();
    this.#eventCleanups.forEach(cleanup => cleanup());
    this.#eventCleanups.clear();
  }

  static setSubscription(key: string, subscription: Subscription) {
    this.#subscriptions.set(key, subscription);
  }

  static unsubscribe(key: string) {
    const subscription = this.#subscriptions.get(key);
    if (subscription) {
      subscription.unsubscribe();
      this.#subscriptions.delete(key);
    }
  }

  static setEventCleanup(key: string, cleanup: () => void) {
    // Clean up existing event first
    const existing = this.#eventCleanups.get(key);
    if (existing) {
      existing();
    }
    this.#eventCleanups.set(key, cleanup);
  }

  static cleanupEvent(key: string) {
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
          drawInstance.addFeatures([feature]);
        }),

        getFeatures: () => E.sync(() => {
          return drawInstance.getSnapshot();
        }),

        onFinish: (callback: (e: DrawFinishEvent) => void) =>
          E.sync(() => {
            const handler = (id: string, context: { action: string; mode: string }) => {
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
              drawInstance.off('finish', handler);
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
