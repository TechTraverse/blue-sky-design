import { List, ListSubheader, Accordion, AccordionSummary, AccordionDetails, Typography } from "@mui/material";
import { IoChevronDown } from "react-icons/io5";
import { LayerList } from "./LayerList";
import { LayerControlProps, LayerItem, LayerGroup } from "./types";
import "./LayerControl.css";

function groupLayersByFunction(layers: LayerItem[], groupBy?: (layer: LayerItem) => string): LayerGroup[] {
  if (!groupBy) {
    return [{ name: "All", layers }];
  }

  const groups: Record<string, LayerItem[]> = {};
  
  layers.forEach(layer => {
    const groupName = groupBy(layer);
    if (!groups[groupName]) groups[groupName] = [];
    groups[groupName].push(layer);
  });

  return Object.entries(groups).map(([name, layers]) => ({ name, layers }));
}

function DisabledList({ 
  disabledLayers, 
  onLayerToggle, 
  onLayerDownload, 
  renderLayerIcon, 
  groupBy 
}: {
  disabledLayers: LayerItem[];
  onLayerToggle: (layerId: string, enabled: boolean) => void;
  onLayerDownload?: (layer: LayerItem) => void;
  renderLayerIcon?: (layer: LayerItem) => React.ReactNode;
  groupBy?: (layer: LayerItem) => string;
}) {
  const groupedLayers = groupLayersByFunction(disabledLayers, groupBy);

  return (
    <div className="availableLayers">
      <ListSubheader>Available</ListSubheader>
      {groupedLayers.map(({ name: groupName, layers }) => (
        <Accordion key={groupName} defaultExpanded>
          <AccordionSummary expandIcon={<IoChevronDown />}>
            <Typography variant="subtitle2">{groupName} ({layers.length})</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <LayerList 
              layers={layers}
              onLayerToggle={onLayerToggle}
              onLayerDownload={onLayerDownload}
              renderLayerIcon={renderLayerIcon}
            />
          </AccordionDetails>
        </Accordion>
      ))}
    </div>
  );
}

function EnabledList({ 
  enabledLayers, 
  onLayerToggle, 
  onLayerReorder, 
  onLayerDownload, 
  renderLayerIcon 
}: {
  enabledLayers: LayerItem[];
  onLayerToggle: (layerId: string, enabled: boolean) => void;
  onLayerReorder: (layerId: string, newPosition: number) => void;
  onLayerDownload?: (layer: LayerItem) => void;
  renderLayerIcon?: (layer: LayerItem) => React.ReactNode;
}) {
  return (
    <List
      className="currentlyActiveLayers"
      subheader={<ListSubheader>Currently Active</ListSubheader>}
    >
      <LayerList 
        layers={enabledLayers} 
        dragCapable
        onLayerToggle={onLayerToggle}
        onLayerReorder={onLayerReorder}
        onLayerDownload={onLayerDownload}
        renderLayerIcon={renderLayerIcon}
      />
    </List>
  );
}

export function LayerControl({
  enabledLayers,
  disabledLayers,
  onLayerToggle,
  onLayerReorder,
  onLayerDownload,
  groupBy,
  renderLayerIcon,
  className = ""
}: LayerControlProps) {
  return (
    <div className={`layer-control ${className}`}>
      <EnabledList 
        enabledLayers={enabledLayers}
        onLayerToggle={onLayerToggle}
        onLayerReorder={onLayerReorder}
        onLayerDownload={onLayerDownload}
        renderLayerIcon={renderLayerIcon}
      />
      <DisabledList 
        disabledLayers={disabledLayers}
        onLayerToggle={onLayerToggle}
        onLayerDownload={onLayerDownload}
        renderLayerIcon={renderLayerIcon}
        groupBy={groupBy}
      />
    </div>
  );
}