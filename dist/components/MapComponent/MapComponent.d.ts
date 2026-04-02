import { default as React } from 'react';
import { MapComponentCoreProps, MapComponentCallbacks, MapOperations, SourceConfig } from './types';
import { Map as MapLibreMap } from 'maplibre-gl';
export interface MapComponentProps extends MapComponentCoreProps, MapComponentCallbacks {
    initialLayers?: Array<{
        id: string;
        type: 'basemap' | 'overlay';
        url?: string;
        sourceConfig?: SourceConfig;
    }>;
}
export interface MapComponentRef extends MapOperations {
    getMapInstance: () => MapLibreMap;
}
export declare const MapComponent: React.ForwardRefExoticComponent<MapComponentProps & React.RefAttributes<MapComponentRef>>;
