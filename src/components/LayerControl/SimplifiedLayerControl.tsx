import { List, ListSubheader } from "@mui/material";
import { LayerList } from "./LayerList";
import { LayerItem } from "./types";
import "./LayerControl.css";

export interface SimplifiedLayerControlProps {
  activeLayer: LayerItem;
  onLayerDownload?: (layer: LayerItem) => void;
  renderLayerIcon?: (layer: LayerItem) => React.ReactNode;
  className?: string;
}

export function SimplifiedLayerControl({
  activeLayer,
  onLayerDownload,
  renderLayerIcon,
  className = ""
}: SimplifiedLayerControlProps) {
  const handleLayerToggle = () => {
    // No-op since there's only one active layer
  };

  return (
    <div className={`layer-control ${className}`}>
      <List
        className="currentlyActiveLayers"
        subheader={<ListSubheader>Active Layer</ListSubheader>}
      >
        <LayerList 
          layers={[activeLayer]} 
          dragCapable={false}
          onLayerToggle={handleLayerToggle}
          onLayerDownload={onLayerDownload}
          renderLayerIcon={renderLayerIcon}
        />
      </List>
    </div>
  );
}