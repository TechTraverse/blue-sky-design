import { default as React } from 'react';
import { MapComponentCoreProps, MapComponentCallbacks, MapOperations } from './types';
export interface MapComponentProps extends MapComponentCoreProps, MapComponentCallbacks {
    initialLayers?: Array<{
        id: string;
        type: 'basemap' | 'overlay';
        url?: string;
        sourceConfig?: any;
    }>;
}
export interface MapComponentRef extends MapOperations {
    getMapInstance: () => any;
}
export declare const MapComponent: React.ForwardRefExoticComponent<MapComponentProps & React.RefAttributes<MapComponentRef>>;
