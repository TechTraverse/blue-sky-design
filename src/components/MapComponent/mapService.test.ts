import { describe, it, expect } from "vitest";
import { Effect as E } from "effect";
import {
  MapClassWrapper,
  LargeScaleImagery,
  LargeScaleVector,
  SmallScaleVector,
  RasterTiles,
  VectorTiles,
  LayerEnabled,
  LayerVisible,
  type LayerType,
} from "./mapService";

/**
 * Behavioral tests for MapClassWrapper's Effect-returning methods, driven against
 * a Proxy-recorder stub map that records the MapLibre calls it receives.
 *
 * - Case A pins the sequence of map mutations a date change produces for a mix of
 *   layer kinds (a raster tile layer, a vector tile layer, and a common layer
 *   whose visibility is toggled), so the observable ordering can't drift.
 * - Case B asserts these methods are referentially transparent: building the
 *   returned Effect performs no map mutation; only interpreting it does.
 * - Case C asserts the double-buffered tile swap reads the map's current source
 *   ids when it runs, not when the Effect was built, so a queued swap cleans up
 *   whatever is actually present at interpretation time.
 */

type Call = { method: string; args: unknown[] };
type StubLayer = { id: string; type?: string; source?: string };

const MUTATION_METHODS = new Set([
  "addSource",
  "addLayer",
  "setLayoutProperty",
  "removeLayer",
  "removeSource",
]);

const mutationSeq = (calls: Call[]) =>
  calls.filter((c) => MUTATION_METHODS.has(c.method)).map((c) => c.method);

/**
 * A stub MapLibre map that records the mutating calls in order. Only the methods
 * whose behavior the wrapper's control flow actually depends on are implemented;
 * a Proxy auto-stubs every other method as a recording no-op, so the test does
 * not silently break when the wrapper's map usage changes.
 */
const makeRecordingMap = ({ autoSettle = true }: { autoSettle?: boolean } = {}) => {
  const calls: Call[] = [];
  const listeners: Record<string, Array<(e: unknown) => void>> = {};
  let layers: StubLayer[] = [
    { id: "BASEMAP-background", type: "background" },
    { id: "LABELS-symbols", type: "symbol", source: "LABELS-src" },
  ];
  const sources: Record<string, unknown> = { "LABELS-src": { id: "LABELS-src" } };

  const rec = (method: string, ...args: unknown[]) => {
    calls.push({ method, args });
  };

  const target = {
    // Event plumbing: the double-buffer swap registers a `sourcedata` listener
    // via on() directly (not through rxjs), and addSource() fires it.
    on(type: string, listener: (e: unknown) => void) {
      (listeners[type] ??= []).push(listener);
      return proxy;
    },
    off(type: string, listener: (e: unknown) => void) {
      listeners[type] = (listeners[type] ?? []).filter((l) => l !== listener);
      return proxy;
    },
    fire(type: string, e: unknown) {
      (listeners[type] ?? []).slice().forEach((l) => l(e));
      return proxy;
    },
    // Reads the control flow branches on.
    getStyle() {
      return { layers: layers.map((l) => ({ ...l })), sources: { ...sources } };
    },
    isStyleLoaded() {
      return true;
    },
    getSource(id: string) {
      return sources[id];
    },
    getLayer(id: string) {
      return layers.find((l) => l.id === id);
    },
    getPaintProperty() {
      return undefined;
    },
    // Mutations: record + update the backing model.
    addSource(id: string, config: Record<string, unknown>) {
      rec("addSource", id);
      sources[id] = {
        id,
        ...config,
        setData(d: unknown) {
          rec("setData", id, d);
        },
      };
      // Simulate the new tiles finishing load so the double-buffer swap proceeds
      // to drop the old source. The wrapper registers its listener before
      // calling addSource, so a microtask is enough. When autoSettle is off,
      // the test drives loading explicitly via settle() to exercise coalescing.
      if (autoSettle) {
        queueMicrotask(() =>
          proxy.fire("sourcedata", { sourceId: id, isSourceLoaded: true }),
        );
      }
    },
    removeSource(id: string) {
      rec("removeSource", id);
      delete sources[id];
    },
    addLayer(layer: StubLayer) {
      rec("addLayer", layer.id);
      layers.push({ id: layer.id, type: layer.type, source: layer.source });
    },
    removeLayer(id: string) {
      rec("removeLayer", id);
      layers = layers.filter((l) => l.id !== id);
    },
    setLayoutProperty(id: string, prop: string, val: unknown) {
      rec("setLayoutProperty", id, prop, val);
    },
  };

  const proxy = new Proxy(target, {
    get(t, prop, receiver) {
      if (prop in t) return Reflect.get(t, prop, receiver);
      // Don't make the stub look thenable / iterable.
      if (
        typeof prop === "symbol" ||
        prop === "then" ||
        prop === "catch" ||
        prop === "finally"
      ) {
        return Reflect.get(t, prop, receiver);
      }
      // Any other map method the wrapper reaches for is a recording no-op.
      return (...args: unknown[]) => {
        rec(String(prop), ...args);
        return undefined;
      };
    },
  }) as unknown as { addSource: (id: string, cfg: Record<string, unknown>) => void };

  // Fire `sourcedata`/isSourceLoaded for every currently-present source whose id
  // starts with `prefix` (covers the random `_<uuid>` buffer suffix), settling
  // whichever buffered swap is waiting on it.
  const settle = (prefix: string) => {
    Object.keys(sources)
      .filter((id) => id.startsWith(prefix))
      .forEach((id) =>
        proxy.fire("sourcedata", { sourceId: id, isSourceLoaded: true }),
      );
  };

  return { map: proxy, calls, settle, sources };
};

const rasterImageryLayer = (): LayerType =>
  LargeScaleImagery({
    id: "RASTER_IMG",
    humanReadableName: "Raster Imagery",
    sourceConfig: RasterTiles({
      id: "RASTER_IMG",
      type: "raster",
      tiles: ["https://tiles.example/raster/{z}/{x}/{y}.png?d=OLD"],
      tileSize: 256,
    }),
    orderedLayerConfigs: [
      { id: "RASTER_IMG-raster", type: "raster", source: "RASTER_IMG" },
    ],
    paramKeyVals: { d: "NEW" },
    enabled: LayerEnabled({ visible: LayerVisible(), order: 1 }),
  });

const vectorSceneLayer = (): LayerType =>
  LargeScaleVector({
    id: "VECTOR_SCENE",
    humanReadableName: "Vector Scene",
    sourceConfig: VectorTiles({
      id: "VECTOR_SCENE",
      type: "vector",
      tiles: ["https://tiles.example/vector/{z}/{x}/{y}.pbf?d=OLD"],
    }),
    orderedLayerConfigs: [
      {
        id: "VECTOR_SCENE-line",
        type: "line",
        source: "VECTOR_SCENE",
        "source-layer": "scene",
      },
    ],
    paramKeyVals: { d: "NEW" },
    enabled: LayerEnabled({ visible: LayerVisible(), order: 2 }),
  });

// A TimeHandlingWindow layer, from the map's perspective, is just a common data
// layer that is either wholly hidden or filtered down to the features valid at the
// cursor. The window/validity logic itself lives in wlfs-client; here we model both
// outcomes — setLayerVisibility(none) and setFilter(expr).
const windowLayer = (): LayerType =>
  SmallScaleVector({
    id: "WINDOW_LAYER",
    humanReadableName: "Window Layer",
    sourceConfig: VectorTiles({
      id: "WINDOW_LAYER",
      type: "vector",
      tiles: ["https://tiles.example/window/{z}/{x}/{y}.pbf"],
    }),
    orderedLayerConfigs: [
      {
        id: "WINDOW_LAYER-fill",
        type: "fill",
        source: "WINDOW_LAYER",
        "source-layer": "window",
      },
    ],
    paramKeyVals: {},
    enabled: LayerEnabled({ visible: LayerVisible(), order: 3 }),
  });

/** A raster imagery layer whose tiles URL carries `tag`, so overlapping swap
 *  frames can be told apart by the source config the swap ends up applying. */
const rasterFrame = (tag: string): LayerType =>
  LargeScaleImagery({
    id: "RASTER_IMG",
    humanReadableName: "Raster Imagery",
    sourceConfig: RasterTiles({
      id: "RASTER_IMG",
      type: "raster",
      tiles: [`https://tiles.example/raster/{z}/{x}/{y}.png?d=${tag}`],
      tileSize: 256,
    }),
    orderedLayerConfigs: [
      { id: "RASTER_IMG-raster", type: "raster", source: "RASTER_IMG" },
    ],
    paramKeyVals: { d: tag },
    enabled: LayerEnabled({ visible: LayerVisible(), order: 1 }),
  });

/** Build a wrapper over a fresh recording map with the three layers added. */
const setup = async (opts?: { autoSettle?: boolean }) => {
  const { map, calls, settle, sources } = makeRecordingMap(opts);
  const wrapper = new MapClassWrapper(
    map as never,
    "https://basemap.example",
    { navigation: false, fullscreen: false, geolocate: false, scale: false, attribution: false },
  );

  const raster = rasterImageryLayer();
  const vector = vectorSceneLayer();
  const winLayer = windowLayer();

  await E.runPromise(wrapper.addLayer(raster));
  await E.runPromise(wrapper.addLayer(vector));
  await E.runPromise(wrapper.addLayer(winLayer));

  calls.length = 0; // only characterize what the date change does
  return { wrapper, calls, map, settle, sources, raster, vector, winLayer };
};

/** Flush pending microtasks + macrotasks so queued Effect fibers can run. */
const tick = () => new Promise((r) => setTimeout(r, 0));

describe("MapClassWrapper date change", () => {
  it("A: produces addSource/addLayer/removeLayer/removeSource per tile layer then setLayoutProperty for the excluded window layer, in order", async () => {
    const { wrapper, calls, raster, vector, winLayer } = await setup();

    // A date change: re-parameterize the tile layers (double-buffered swap) and
    // hide the window layer whose validity window excludes the new date.
    await E.runPromise(wrapper.updateSourceParams([raster, vector]));
    await E.runPromise(wrapper.setLayerVisibility(winLayer as never, "none"));

    // updateSourceParams reverses input order: vector swaps first, then raster,
    // then the window layer's visibility is set.
    expect(mutationSeq(calls)).toEqual([
      "addSource",
      "addLayer",
      "removeLayer",
      "removeSource",
      "addSource",
      "addLayer",
      "removeLayer",
      "removeSource",
      "setLayoutProperty",
    ]);

    const setLayout = calls.find((c) => c.method === "setLayoutProperty");
    expect(setLayout?.args).toEqual([
      "COMMON-WINDOW_LAYER-fill",
      "visibility",
      "none",
    ]);
  });

  it("B: setLayerVisibility performs no map mutation until the Effect is interpreted", async () => {
    const { wrapper, calls, winLayer } = await setup();

    const effect = wrapper.setLayerVisibility(winLayer as never, "none");
    // Constructing the Effect must not have mutated the map.
    expect(mutationSeq(calls)).toEqual([]);

    await E.runPromise(effect);
    // Interpreting it applies exactly the one visibility change.
    expect(mutationSeq(calls)).toEqual(["setLayoutProperty"]);
  });

  it("C: the double-buffered swap removes the source ids present when it is interpreted", async () => {
    const { wrapper, calls, map, raster } = await setup();

    // Build the swap Effect but don't interpret it yet.
    const swap = wrapper.updateSourceParams([raster]);

    // A prior queued swap could leave a suffixed buffer source behind. Add one
    // AFTER constructing the Effect: the swap must observe the map state at
    // interpretation and clean this up too.
    map.addSource("RASTER_IMG_stale", { type: "raster", tiles: [] });
    calls.length = 0;

    await E.runPromise(swap);

    const removedSources = calls
      .filter((c) => c.method === "removeSource")
      .map((c) => c.args[0]);
    expect(removedSources).toContain("RASTER_IMG");
    expect(removedSources).toContain("RASTER_IMG_stale");
  });

  it("D: overlapping swaps for one source coalesce to the newest frame", async () => {
    const { wrapper, calls, settle, sources } = await setup({ autoSettle: false });
    calls.length = 0;

    // Four frames fired back-to-back without settling: the in-flight swap holds
    // and later frames overwrite a single pending slot, so intermediates drop.
    const ps = ["A", "B", "C", "D"].map((t) =>
      E.runPromise(wrapper.updateSourceParams([rasterFrame(t)])),
    );
    await tick(); // let all four register their pending target (newest = D)

    // Settle the in-flight buffer → drain applies it, then picks up the newest
    // pending (frame D), settled on the next round.
    settle("RASTER_IMG");
    await tick();
    settle("RASTER_IMG");
    await Promise.all(ps);

    // Coalesced: far fewer swaps than frames (not one per frame).
    const addSourceCount = calls.filter((c) => c.method === "addSource").length;
    expect(addSourceCount).toBeGreaterThanOrEqual(1);
    expect(addSourceCount).toBeLessThanOrEqual(2);

    // The single surviving buffer carries the newest frame's tiles.
    const survivors = Object.keys(sources).filter((id) => id.startsWith("RASTER_IMG_"));
    expect(survivors).toHaveLength(1);
    const surviving = sources[survivors[0]] as { tiles?: string[] };
    expect(surviving.tiles?.[0]).toContain("d=D");
  });

  it("E: layer-load status fires once per applied frame, never for dropped frames", async () => {
    const { wrapper, calls, settle } = await setup({ autoSettle: false });
    const tags: string[] = [];
    wrapper.setOnLayerLoadStatus((st) => tags.push(st._tag));
    calls.length = 0;

    const ps = ["A", "B", "C", "D"].map((t) =>
      E.runPromise(wrapper.updateSourceParams([rasterFrame(t)])),
    );
    await tick();
    settle("RASTER_IMG");
    await tick();
    settle("RASTER_IMG");
    await Promise.all(ps);

    const applied = calls.filter((c) => c.method === "addSource").length;
    const loading = tags.filter((t) => t === "Loading").length;
    const loaded = tags.filter((t) => t === "Loaded").length;
    // Status is emitted exactly once per applied frame — dropped frames are silent.
    expect(loading).toBe(applied);
    expect(loaded).toBe(applied);
    expect(loading).toBeLessThan(4);
  });

  it("F: setFilter applies the expression to every map layer id the descriptor owns", async () => {
    const { wrapper, calls, map, winLayer } = await setup();

    // A swap can leave a suffixed sibling behind, and #getMapLayerIds matches by
    // prefix — so the filter must reach that one too, not just the exact id.
    (map as unknown as { addLayer: (l: StubLayer) => void }).addLayer({
      id: "COMMON-WINDOW_LAYER-fill_abc123",
      type: "fill",
      source: "WINDOW_LAYER",
    });
    calls.length = 0;

    const expr = ["all", [">=", ["get", "End_"], 1756400000000]];
    await E.runPromise(wrapper.setFilter(winLayer as never, expr as never));

    expect(calls.filter((c) => c.method === "setFilter").map((c) => c.args)).toEqual([
      ["COMMON-WINDOW_LAYER-fill", expr],
      ["COMMON-WINDOW_LAYER-fill_abc123", expr],
    ]);
  });

  it("G: setFilter is lazy, and null clears the filter", async () => {
    const { wrapper, calls, winLayer } = await setup();

    const effect = wrapper.setFilter(winLayer as never, null);
    // Same referential-transparency contract as case B.
    expect(calls.filter((c) => c.method === "setFilter")).toEqual([]);

    await E.runPromise(effect);
    // `undefined` is what MapLibre reads as "no filter"; null must not reach it.
    expect(calls.filter((c) => c.method === "setFilter").map((c) => c.args)).toEqual([
      ["COMMON-WINDOW_LAYER-fill", undefined],
    ]);
  });
});
