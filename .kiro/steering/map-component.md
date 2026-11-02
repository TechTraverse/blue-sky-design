---
inclusion: fileMatch
fileMatchPattern: ["src/components/MapComponent/**"]
---

# MapComponent and MapClassWrapper

- `MapComponent` is the React-only map; `MapComponentEffect` is the Effect-integrated version. Both wrap a MapLibre map.
- `mapService.ts` holds `MapClassWrapper`, the `MapService` Effect tag and `MapServiceLayer`, and the layer model types. wlfs-client drives the map through `MapClassWrapper`, and its preflight checks methods such as `preloadFrames` and `isHiddenFrameLayer` in `dist/components/MapComponent/mapService.d.ts`.
- `basemapFallback.ts` collects a basemap's tile domains and recognizes basemap auth errors, so the map can fall back when a basemap fails to load.

## Layer model

- Variants are `Data.TaggedEnum`s: source kind (`VectorTiles`, `RasterTiles`, `GeoJsonData`), visibility (`LayerVisible`, `LayerHidden`, `LayerDimmed`), selectability, enabled state, and layer type for draw order (`Basemap`, `Labels`, `LargeScaleVector`, `SmallScaleVector`, `LargeScaleImagery`, `SmallScaleImagery`, `CustomOrder`). Match them with `ts-pattern` `.exhaustive()`.
- Layer ids carry prefixes (`BASEMAP_PREFIX`, `LABELS_PREFIX`, `COMMON_PREFIX`); `extractLayerResourceId` strips them. Keep ids consistent with those helpers.

## Rules for `MapClassWrapper` methods

- Effect-returning methods are **referentially transparent**: building the Effect performs no map mutation; only running it does. Don't touch the map outside the Effect body.
- Read map state (current sources, layers) when the Effect runs, not when it's built, so a queued operation sees the map as it is then.
- Keep the order of map mutations stable; `mapService.test.ts` pins the sequence a date change produces.

## Tests

`mapService.test.ts` drives `MapClassWrapper` against a Proxy-recorder stub map that records the MapLibre calls it receives. No real map or DOM is needed. Assert on the recorded calls.
