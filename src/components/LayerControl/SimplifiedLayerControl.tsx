import { List, ListSubheader } from "@mui/material";
import { LayerList } from "./LayerList";
import { LayerItem } from "./types";
import "./LayerControl.css";

export interface SimplifiedLayerControlProps {
  activeLayers: LayerItem[];
  onLayerToggle: (layerId: string, enabled: boolean) => void;
  onLayerDownload?: (layer: LayerItem) => void;
  renderLayerIcon?: (layer: LayerItem) => React.ReactNode;
  className?: string;
}

export function SimplifiedLayerControl({
  activeLayers,
  onLayerToggle,
  onLayerDownload,
  renderLayerIcon,
  className = ""
}: SimplifiedLayerControlProps) {
  return (
    <div className={`layer-control ${className}`}>
      <List
        className="currentlyActiveLayers"
        subheader={<ListSubheader>Active Layers</ListSubheader>}
      >
        <LayerList
          layers={activeLayers}
          dragCapable={false}
          onLayerToggle={onLayerToggle}
          onLayerDownload={onLayerDownload}
          renderLayerIcon={renderLayerIcon}
        />
      </List>
    </div>
  );
}