export { LayerControl } from "./LayerControl";
export { SimplifiedLayerControl, type SimplifiedLayerControlProps } from "./SimplifiedLayerControl";
export { LayerList } from "./LayerList";
// Named LayerItemComponent so it doesn't shadow the LayerItem interface that
// `export * from "./types"` provides — an explicit export wins over a star one.
export { LayerItem as LayerItemComponent } from "./LayerItem";
export * from "./types";