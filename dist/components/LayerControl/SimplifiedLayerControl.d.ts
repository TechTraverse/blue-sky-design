import { LayerItem } from './types';
export interface SimplifiedLayerControlProps {
    activeLayers: LayerItem[];
    onLayerToggle: (layerId: string, enabled: boolean) => void;
    onLayerDownload?: (layer: LayerItem) => void;
    onLayerOpacityChange?: (layerId: string, opacity: number) => void;
    renderLayerIcon?: (layer: LayerItem) => React.ReactNode;
    className?: string;
}
export declare function SimplifiedLayerControl({ activeLayers, onLayerToggle, onLayerDownload, onLayerOpacityChange, renderLayerIcon, className }: SimplifiedLayerControlProps): import("react/jsx-runtime").JSX.Element;
