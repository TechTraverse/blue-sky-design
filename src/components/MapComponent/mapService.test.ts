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
 * - Case C asserts a tile swap reads the map's current source ids when it runs,
 *   not when the Effect was built, so a queued swap cleans up whatever is
 *   actually present at interpretation time.
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
const makeRecordingMap = (opts: { deferLoads?: boolean } = {}) => {
  const calls: Call[] = [];
  const listeners: Record<string, Array<(e: unknown) => void>> = {};
  let layers: StubLayer[] = [
    { id: "BASEMAP-background", type: "background" },
    { id: "LABELS-symbols", type: "symbol", source: "LABELS-src" },
  ];
  const sources: Record<string, unknown> = { "LABELS-src": { id: "LABELS-src" } };
  const loadedSources = new Set<string>();
  const paint: Record<string, Record<string, unknown>> = {};
  const layout: Record<string, Record<string, unknown>> = {};
  const filters: Record<string, unknown> = {};

  const rec = (method: string, ...args: unknown[]) => {
    calls.push({ method, args });
  };

  const target = {
    // Event plumbing: a tile frame swap registers a `sourcedata` listener
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
    getPaintProperty(id: string, prop: string) {
      return paint[id]?.[prop];
    },
    getLayoutProperty(id: string, prop: string) {
      return layout[id]?.[prop];
    },
    getFilter(id: string) {
      return filters[id];
    },
    // A raster frame swap checks this before waiting on `sourcedata`.
    isSourceLoaded(id: string) {
      return loadedSources.has(id);
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
      // Simulate the new tiles finishing load so a tile frame swap proceeds
      // to drop the old source. The wrapper registers its listener before
      // calling addSource, so a microtask is enough.
      if (!opts.deferLoads) queueMicrotask(() => finishLoad(id));
    },
    removeSource(id: string) {
      rec("removeSource", id);
      delete sources[id];
      loadedSources.delete(id);
    },
    // MapLibre inserts immediately below beforeId; `layers` is ordered bottom→top.
    addLayer(layer: StubLayer & { paint?: Record<string, unknown> }, beforeId?: string) {
      rec("addLayer", layer.id, beforeId);
      paint[layer.id] = { ...layer.paint };
      layout[layer.id] = { ...(layer as { layout?: Record<string, unknown> }).layout };
      filters[layer.id] = (layer as { filter?: unknown }).filter;
      const entry = { id: layer.id, type: layer.type, source: layer.source };
      const at = beforeId ? layers.findIndex((l) => l.id === beforeId) : -1;
      if (at === -1) layers.push(entry);
      else layers.splice(at, 0, entry);
    },
    // Same placement rule as addLayer: below beforeId, or on top without one.
    moveLayer(id: string, beforeId?: string) {
      rec("moveLayer", id, beforeId);
      const entry = layers.find((l) => l.id === id);
      if (!entry || id === beforeId) return;
      layers = layers.filter((l) => l.id !== id);
      const at = beforeId ? layers.findIndex((l) => l.id === beforeId) : -1;
      if (at === -1) layers.push(entry);
      else layers.splice(at, 0, entry);
    },
    removeLayer(id: string) {
      rec("removeLayer", id);
      layers = layers.filter((l) => l.id !== id);
    },
    setLayoutProperty(id: string, prop: string, val: unknown) {
      rec("setLayoutProperty", id, prop, val);
      (layout[id] ??= {})[prop] = val;
    },
    setPaintProperty(id: string, prop: string, val: unknown) {
      rec("setPaintProperty", id, prop, val);
      (paint[id] ??= {})[prop] = val;
    },
    setFilter(id: string, filter: unknown) {
      rec("setFilter", id, filter);
      filters[id] = filter;
    },
  };

  // Marks a source's tiles loaded, as MapLibre's `sourcedata` does once they arrive.
  const finishLoad = (id: string) => {
    loadedSources.add(id);
    proxy.fire("sourcedata", { sourceId: id, isSourceLoaded: true });
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

  return { map: proxy, calls, finishLoad, paint };
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
// layer whose visibility is toggled when the new date falls outside its validity
// window. The window/validity logic itself lives in wlfs-client; here we model
// the "excluded" outcome as setLayerVisibility(none).
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

/** Build a wrapper over a fresh recording map with the three layers added. */
const setup = async (opts: { deferLoads?: boolean } = {}) => {
  const { map, calls, finishLoad, paint } = makeRecordingMap(opts);
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
  return { wrapper, calls, map, raster, vector, winLayer, finishLoad, paint };
};

const STALE_UUID = "0b5c4e2a-7d1f-4c3b-9a8e-6f2d1c0b9a87";

/** A tile layer at another time step: same layer, different tile URLs. */
const atFrame = (layer: LayerType, d: string): LayerType => ({ ...layer, paramKeyVals: { d } }) as LayerType;

describe("MapClassWrapper date change", () => {
  it("A: produces addSource/addLayer/removeLayer/removeSource per tile layer then setLayoutProperty for the excluded window layer, in order", async () => {
    const { wrapper, calls, raster, vector, winLayer } = await setup();

    // A date change: re-parameterize the tile layers (a frame swap each) and
    // hide the window layer whose validity window excludes the new date.
    await E.runPromise(wrapper.updateSourceParams([atFrame(raster, "NEXT"), atFrame(vector, "NEXT")]));
    await E.runPromise(wrapper.setLayerVisibility(winLayer as never, "none"));

    // updateSourceParams reverses input order: vector's new frame goes in
    // first, then raster's; both then wait on their tiles together and drop
    // their old frames; then the window layer's visibility is set.
    expect(mutationSeq(calls)).toEqual([
      "addSource",
      "addLayer",
      "addSource",
      "addLayer",
      "removeLayer",
      "removeSource",
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

  it("C: a tile swap removes the source ids present when it is interpreted", async () => {
    const { wrapper, calls, map, raster } = await setup();

    // Build the swap Effect but don't interpret it yet.
    const swap = wrapper.updateSourceParams([atFrame(raster, "NEXT")]);

    // A prior queued swap could leave a suffixed frame source behind. Add one
    // AFTER constructing the Effect: the swap must observe the map state at
    // interpretation and clean this up too.
    map.addSource(`RASTER_IMG_${STALE_UUID}`, { type: "raster", tiles: [] });
    calls.length = 0;

    await E.runPromise(swap);

    const removedSources = calls
      .filter((c) => c.method === "removeSource")
      .map((c) => c.args[0]);
    expect(removedSources).toContain("RASTER_IMG");
    expect(removedSources).toContain(`RASTER_IMG_${STALE_UUID}`);
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

  it("H: moveLayer reorders the live layer after a swap instead of duplicating it", async () => {
    const { wrapper, calls, map, raster, vector } = await setup();
    const styleIds = () =>
      (map as unknown as { getStyle: () => { layers: StubLayer[] } })
        .getStyle().layers.map((l) => l.id);
    const sourceIds = () =>
      Object.keys(
        (map as unknown as { getStyle: () => { sources: Record<string, unknown> } })
          .getStyle().sources,
      );

    // A date change swaps both tile layers, so their live ids carry the
    // `_<uuid>` buffer suffix and the un-suffixed ones no longer exist.
    await E.runPromise(wrapper.updateSourceParams([atFrame(raster, "NEXT"), atFrame(vector, "NEXT")]));
    const liveRaster = styleIds().filter((id) => id.startsWith("COMMON-RASTER_IMG-raster"));
    const liveVector = styleIds().filter((id) => id.startsWith("COMMON-VECTOR_SCENE-line"));
    expect(liveRaster).toHaveLength(1);
    expect(liveRaster[0]).not.toBe("COMMON-RASTER_IMG-raster");
    expect(liveVector).toHaveLength(1);
    const sourcesBefore = sourceIds();
    calls.length = 0;

    // Drag the raster layer up, above the vector layer.
    await E.runPromise(wrapper.moveLayer(raster, undefined));

    // A move must not rebuild anything: removing the un-suffixed id was a no-op
    // and re-adding it stacked a second layer, on its own freshly re-added
    // un-parameterized source, above the real one.
    expect(mutationSeq(calls)).toEqual([]);
    expect(sourceIds()).toEqual(sourcesBefore);
    expect(styleIds().filter((id) => id.startsWith("COMMON-RASTER_IMG-raster")))
      .toEqual(liveRaster);

    // It reorders the id that is actually live, beneath the labels layer.
    expect(calls.filter((c) => c.method === "moveLayer").map((c) => c.args)).toEqual([
      [liveRaster[0], "LABELS-symbols"],
    ]);
    const ids = styleIds();
    expect(ids.indexOf(liveRaster[0])).toBe(ids.indexOf("LABELS-symbols") - 1);
    expect(ids.indexOf(liveVector[0])).toBeLessThan(ids.indexOf(liveRaster[0]));

    // And back down, beneath the vector layer's live id.
    calls.length = 0;
    await E.runPromise(wrapper.moveLayer(raster, vector));
    expect(mutationSeq(calls)).toEqual([]);
    expect(calls.filter((c) => c.method === "moveLayer").map((c) => c.args)).toEqual([
      [liveRaster[0], liveVector[0]],
    ]);
    const after = styleIds();
    expect(after.indexOf(liveRaster[0])).toBe(after.indexOf(liveVector[0]) - 1);
  });
});

describe("MapClassWrapper raster frames", () => {
  const rasterIds = (map: unknown) =>
    (map as { getStyle: () => { layers: StubLayer[] } })
      .getStyle().layers.map((l) => l.id).filter((id) => id.startsWith("COMMON-RASTER_IMG-raster"));
  const sourceIds = (map: unknown) =>
    Object.keys((map as { getStyle: () => { sources: Record<string, unknown> } }).getStyle().sources)
      .filter((id) => id.startsWith("RASTER_IMG"));
  const opacity = (paint: Record<string, Record<string, unknown>>, id: string) =>
    paint[id]?.["raster-opacity"] ?? 1;

  it("I: re-showing the frame already on the map builds nothing", async () => {
    const { wrapper, calls, raster } = await setup();

    await E.runPromise(wrapper.updateSourceParams([raster]));

    expect(mutationSeq(calls)).toEqual([]);
  });

  it("J: preloadFrames adds hidden frames, and showing one is a paint flip", async () => {
    const { wrapper, calls, map, raster, paint } = await setup();
    const [shown] = rasterIds(map);

    await E.runPromise(wrapper.preloadFrames(raster, [{ d: "T1" }, { d: "T2" }]));
    expect(mutationSeq(calls)).toEqual(["addSource", "addLayer", "addSource", "addLayer"]);
    const preloaded = rasterIds(map).filter((id) => id !== shown);
    expect(preloaded).toHaveLength(2);
    preloaded.forEach((id) => expect(opacity(paint, id)).toBe(0));
    expect(opacity(paint, shown)).toBe(1);

    // Let the preloads load, then advance to T1: no new source, only opacity.
    await Promise.resolve();
    calls.length = 0;
    await E.runPromise(wrapper.updateSourceParams([atFrame(raster, "T1")]));

    // The old shown frame isn't preloaded, so it goes; T2 stays.
    expect(mutationSeq(calls)).toEqual(["removeLayer", "removeSource"]);
    expect(rasterIds(map)).not.toContain(shown);
    const t1 = calls.find((c) => c.method === "setPaintProperty" && c.args[2] === 1)?.args[0] as string;
    expect(preloaded).toContain(t1);
    expect(opacity(paint, t1)).toBe(1);
    preloaded.filter((id) => id !== t1).forEach((id) => expect(opacity(paint, id)).toBe(0));
  });

  it("K: opacity reaches only the shown frame and carries over on a flip", async () => {
    const { wrapper, calls, map, raster, paint } = await setup();
    const [shown] = rasterIds(map);
    await E.runPromise(wrapper.preloadFrames(raster, [{ d: "T1" }]));
    const [t1] = rasterIds(map).filter((id) => id !== shown);
    await Promise.resolve();

    await E.runPromise(wrapper.setLayerOpacity(raster as never, 0.4));
    expect(opacity(paint, shown)).toBe(0.4);
    expect(opacity(paint, t1)).toBe(0);

    calls.length = 0;
    await E.runPromise(wrapper.updateSourceParams([atFrame(raster, "T1")]));
    expect(opacity(paint, t1)).toBe(0.4);
  });

  it("L: preloadFrames([]) releases the preloaded frames and keeps the shown one", async () => {
    const { wrapper, map, raster } = await setup();
    const [shown] = rasterIds(map);
    await E.runPromise(wrapper.preloadFrames(raster, [{ d: "T1" }, { d: "T2" }]));
    expect(sourceIds(map)).toHaveLength(3);

    await E.runPromise(wrapper.preloadFrames(raster, []));

    expect(rasterIds(map)).toEqual([shown]);
    expect(sourceIds(map)).toEqual(["RASTER_IMG"]);
  });

  it("M: a slow frame finishing after a newer request doesn't replace it", async () => {
    const { wrapper, map, raster, paint, finishLoad } = await setup({ deferLoads: true });
    const [initial] = rasterIds(map);
    await E.runPromise(wrapper.preloadFrames(raster, [{ d: "FAST" }]));
    const fastSource = sourceIds(map).find((id) => id !== "RASTER_IMG")!;

    // SLOW starts waiting on its tiles...
    const slow = E.runPromise(wrapper.updateSourceParams([atFrame(raster, "SLOW")]));
    const slowSource = sourceIds(map).find((id) => id !== "RASTER_IMG" && id !== fastSource)!;
    expect(slowSource).toBeDefined();

    // ...then FAST, already loaded, is requested and shown at once.
    finishLoad(fastSource);
    await E.runPromise(wrapper.updateSourceParams([atFrame(raster, "FAST")]));
    const [fast] = rasterIds(map).filter((id) => id.endsWith(fastSource.slice("RASTER_IMG".length)));
    expect(opacity(paint, fast)).toBe(1);
    expect(opacity(paint, initial)).toBe(0);

    // SLOW was evicted by that flip, which released its wait instead of leaving
    // it to the timeout, and it never flipped.
    await slow;
    expect(sourceIds(map)).not.toContain(slowSource);
    expect(opacity(paint, fast)).toBe(1);
  });

  it("O: frames that load out of order still move playback forward, never back", async () => {
    const { wrapper, map, raster, paint, finishLoad } = await setup({ deferLoads: true });
    const sourceFor = (before: string[]) => sourceIds(map).find((id) => !before.includes(id))!;
    const layerFor = (source: string) =>
      rasterIds(map).find((id) => id.endsWith(source.slice("RASTER_IMG".length)))!;

    // Three ticks, none loaded yet.
    let before = sourceIds(map);
    const t1 = E.runPromise(wrapper.updateSourceParams([atFrame(raster, "T1")]));
    const s1 = sourceFor(before);
    before = sourceIds(map);
    const t2 = E.runPromise(wrapper.updateSourceParams([atFrame(raster, "T2")]));
    const s2 = sourceFor(before);
    before = sourceIds(map);
    const t3 = E.runPromise(wrapper.updateSourceParams([atFrame(raster, "T3")]));
    const s3 = sourceFor(before);

    // T2 loads first: it's newer than what's shown, so it shows even though T3
    // is pending, and T1, older, is dropped.
    finishLoad(s2);
    await t2;
    expect(opacity(paint, layerFor(s2))).toBe(1);
    await t1;
    expect(sourceIds(map)).not.toContain(s1);

    // T3 then loads and takes over.
    finishLoad(s3);
    await t3;
    expect(opacity(paint, layerFor(s3))).toBe(1);
    expect(sourceIds(map)).toEqual([s3]);
  });

  it("N: a frame preloaded while the layer is hidden is added hidden", async () => {
    const { wrapper, calls, map, raster } = await setup();
    await E.runPromise(wrapper.setLayerVisibility(raster as never, "none"));

    calls.length = 0;
    await E.runPromise(wrapper.preloadFrames(raster, [{ d: "T1" }]));

    const added = calls.find((c) => c.method === "addLayer")?.args[0] as string;
    expect(added).toBeDefined();
    expect((map as unknown as { getLayoutProperty: (id: string, p: string) => unknown })
      .getLayoutProperty(added, "visibility")).toBe("none");
  });
});


describe("MapClassWrapper vector frames", () => {
  const vectorIds = (map: unknown) =>
    (map as { getStyle: () => { layers: StubLayer[] } })
      .getStyle().layers.map((l) => l.id).filter((id) => id.startsWith("COMMON-VECTOR_SCENE-line"));
  const opacity = (paint: Record<string, Record<string, unknown>>, id: string) =>
    paint[id]?.["line-opacity"] ?? 1;

  it("P: the old vector frame stays drawn until the new one has loaded", async () => {
    const { wrapper, calls, map, vector, paint, finishLoad } = await setup({ deferLoads: true });
    const [old] = vectorIds(map);

    const swap = E.runPromise(wrapper.updateSourceParams([atFrame(vector, "T1")]));
    const [next] = vectorIds(map).filter((id) => id !== old);
    expect(opacity(paint, old)).toBe(1);
    expect(opacity(paint, next)).toBe(0);
    expect(mutationSeq(calls)).toEqual(["addSource", "addLayer"]);

    finishLoad(`VECTOR_SCENE${next.slice("COMMON-VECTOR_SCENE-line".length)}`);
    await swap;
    expect(vectorIds(map)).toEqual([next]);
    expect(opacity(paint, next)).toBe(1);
  });

  it("Q: preloaded vector frames are hidden from feature queries until shown", async () => {
    const { wrapper, map, vector } = await setup();
    const [shown] = vectorIds(map);
    await E.runPromise(wrapper.preloadFrames(vector, [{ d: "T1" }]));
    const [t1] = vectorIds(map).filter((id) => id !== shown);
    await Promise.resolve();

    expect(wrapper.isHiddenFrameLayer(shown)).toBe(false);
    expect(wrapper.isHiddenFrameLayer(t1)).toBe(true);
    expect(wrapper.isHiddenFrameLayer("COMMON-WINDOW_LAYER-fill")).toBe(false);

    await E.runPromise(wrapper.updateSourceParams([atFrame(vector, "T1")]));
    expect(wrapper.isHiddenFrameLayer(t1)).toBe(false);
  });

  it("R: a new frame takes the filter set on the shown frame", async () => {
    const { wrapper, calls, map, vector } = await setup();
    const expr = [">=", ["get", "frp"], 50];
    await E.runPromise(wrapper.setFilter(vector as never, expr as never));

    calls.length = 0;
    await E.runPromise(wrapper.preloadFrames(vector, [{ d: "T1" }]));

    const added = calls.find((c) => c.method === "addLayer")?.args[0] as string;
    expect(added).toBeDefined();
    expect((map as unknown as { getFilter: (id: string) => unknown }).getFilter(added)).toEqual(expr);
  });

  it("S: a sibling source sharing the layer's id prefix isn't treated as a frame", async () => {
    const { wrapper, calls, map, vector } = await setup();
    map.addSource("VECTOR_SCENE_GEOJSON", { type: "geojson", data: {} });
    calls.length = 0;

    await E.runPromise(wrapper.updateSourceParams([atFrame(vector, "T1")]));

    const removed = calls.filter((c) => c.method === "removeSource").map((c) => c.args[0]);
    expect(removed).toEqual(["VECTOR_SCENE"]);
  });
});

describe("MapClassWrapper frame bookkeeping", () => {
  type StyleView = { getStyle: () => { layers: StubLayer[]; sources: Record<string, { tiles?: string[] }> } };
  const styleIds = (map: unknown) => (map as StyleView).getStyle().layers.map((l) => l.id);
  const sourceIds = (map: unknown, base: string) =>
    Object.keys((map as StyleView).getStyle().sources).filter((id) => id.startsWith(base));
  // The map layer of `base`'s frame whose tiles are at time step `d`.
  const frameLayer = (map: unknown, base: string, cfgId: string, d: string) => {
    const [sourceId] = Object.entries((map as StyleView).getStyle().sources)
      .find(([id, src]) => id.startsWith(base) && src.tiles?.[0]?.endsWith(`d=${d}`)) ?? [];
    return sourceId && `COMMON-${cfgId}${sourceId.slice(base.length)}`;
  };

  it("T: each layer's frames stay together in the stack, so a layer placed above one lands above all of its frames", async () => {
    const { wrapper, map, raster, vector, winLayer } = await setup();
    await E.runPromise(wrapper.preloadFrames(raster, [{ d: "T1" }, { d: "T2" }]));
    await E.runPromise(wrapper.preloadFrames(vector, [{ d: "T1" }, { d: "T2" }]));
    await Promise.resolve();
    // Vector above raster, as the client sends them: top to bottom.
    await E.runPromise(wrapper.updateSourceParams([atFrame(vector, "T1"), atFrame(raster, "T1")]));

    const positions = (prefix: string) => styleIds(map)
      .map((id, i) => [id, i] as const).filter(([id]) => id.startsWith(prefix)).map(([, i]) => i);
    const isRun = (xs: number[]) => xs.every((x, i) => i === 0 || x === xs[i - 1] + 1);
    const rasterAt = positions("COMMON-RASTER_IMG-raster");
    const vectorAt = positions("COMMON-VECTOR_SCENE-line");
    expect(rasterAt).toHaveLength(2);
    expect(vectorAt).toHaveLength(2);
    expect(isRun(rasterAt)).toBe(true);
    expect(isRun(vectorAt)).toBe(true);
    expect(Math.max(...rasterAt)).toBeLessThan(Math.min(...vectorAt));

    // Drop the window layer in between: beneath every vector frame, above every raster one.
    await E.runPromise(wrapper.moveLayer(winLayer, vector));
    const winAt = styleIds(map).indexOf("COMMON-WINDOW_LAYER-fill");
    expect(winAt).toBe(Math.min(...positions("COMMON-VECTOR_SCENE-line")) - 1);
    expect(winAt).toBe(Math.max(...positions("COMMON-RASTER_IMG-raster")) + 1);
  });

  it("U: removing a layer releases a frame swap still waiting on its tiles", async () => {
    const { wrapper, map, raster } = await setup({ deferLoads: true });
    const swap = E.runPromise(wrapper.updateSourceParams([atFrame(raster, "T1")]));
    await new Promise((r) => setTimeout(r, 0)); // the swap is now waiting on T1's tiles

    await E.runPromise(wrapper.rmLayer(raster));

    const outcome = await Promise.race([
      swap.then(() => "released"),
      new Promise((r) => setTimeout(() => r("still waiting"), 1000)),
    ]);
    expect(outcome).toBe("released");
    expect(sourceIds(map, "RASTER_IMG")).toEqual([]);
  });

  it("V: a date change that runs behind a newer one doesn't show its frames over the newer one's", async () => {
    const { wrapper, map, raster, vector, paint, finishLoad } = await setup({ deferLoads: true });
    await E.runPromise(wrapper.preloadFrames(raster, [{ d: "B" }]));
    await E.runPromise(wrapper.preloadFrames(vector, [{ d: "A" }, { d: "B" }]));
    [...sourceIds(map, "RASTER_IMG"), ...sourceIds(map, "VECTOR_SCENE")]
      .filter((id) => id.includes("_")).forEach(finishLoad);

    // A stalls on raster tiles nobody preloaded; B, all preloaded, overtakes it.
    const a = E.runPromise(wrapper.updateSourceParams([atFrame(vector, "A"), atFrame(raster, "A")]));
    await E.runPromise(wrapper.updateSourceParams([atFrame(vector, "B"), atFrame(raster, "B")]));
    await a;

    const opacity = (id: string | undefined, prop: string) => (id ? paint[id]?.[prop] : undefined) ?? 1;
    expect(opacity(frameLayer(map, "RASTER_IMG", "RASTER_IMG-raster", "B"), "raster-opacity")).toBe(1);
    expect(opacity(frameLayer(map, "VECTOR_SCENE", "VECTOR_SCENE-line", "B"), "line-opacity")).toBe(1);
    expect(opacity(frameLayer(map, "VECTOR_SCENE", "VECTOR_SCENE-line", "A"), "line-opacity")).toBe(0);
  });

  it("W: a layer whose frame is ready shows it while another layer still waits on its tiles", async () => {
    const { wrapper, map, raster, vector, paint, finishLoad } = await setup({ deferLoads: true });
    await E.runPromise(wrapper.preloadFrames(vector, [{ d: "T1" }]));
    sourceIds(map, "VECTOR_SCENE").filter((id) => id.includes("_")).forEach(finishLoad);

    // Raster is first in line and its T1 tiles haven't loaded.
    const swap = E.runPromise(wrapper.updateSourceParams([atFrame(vector, "T1"), atFrame(raster, "T1")]));
    await new Promise((r) => setTimeout(r, 0));

    const opacity = (id: string | undefined, prop: string) => (id ? paint[id]?.[prop] : undefined) ?? 1;
    expect(opacity(frameLayer(map, "VECTOR_SCENE", "VECTOR_SCENE-line", "T1"), "line-opacity")).toBe(1);
    const rasterT1 = frameLayer(map, "RASTER_IMG", "RASTER_IMG-raster", "T1");
    expect(opacity(rasterT1, "raster-opacity")).toBe(0);

    finishLoad(`RASTER_IMG${rasterT1!.slice("COMMON-RASTER_IMG-raster".length)}`);
    await swap;
    expect(opacity(rasterT1, "raster-opacity")).toBe(1);
  });
});
