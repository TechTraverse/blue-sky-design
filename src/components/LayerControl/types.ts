export interface LayerItem {
  id: string;
  name: string;
  enabled: boolean;
  tags?: Set<string>;
  downloadable?: boolean;
  [key: string]: any; // Allow additional properties
}

export interface LayerGroup {
  name: string;
  layers: LayerItem[];
}

export interface LayerControlProps {
  enabledLayers: LayerItem[];
  disabledLayers: LayerItem[];
  onLayerToggle: (layerId: string, enabled: boolean) => void;
  onLayerReorder: (layerId: string, newPosition: number) => void;
  onLayerDownload?: (layer: LayerItem) => void;
  groupBy?: (layer: LayerItem) => string;
  renderLayerIcon?: (layer: LayerItem) => React.ReactNode;
  className?: string;
}

export interface LayerListProps {
  layers: LayerItem[];
  dragCapable?: boolean;
  onLayerToggle: (layerId: string, enabled: boolean) => void;
  onLayerReorder?: (layerId: string, newPosition: number) => void;
  onLayerDownload?: (layer: LayerItem) => void;
  renderLayerIcon?: (layer: LayerItem) => React.ReactNode;
}

export interface LayerItemComponentProps {
  layer: LayerItem;
  dragCapable: boolean;
  onLayerToggle: (layerId: string, enabled: boolean) => void;
  onLayerDownload?: (layer: LayerItem) => void;
  renderLayerIcon?: (layer: LayerItem) => React.ReactNode;
}