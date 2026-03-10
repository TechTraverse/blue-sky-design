import { default as React } from 'react';
import { Effect as E, Layer } from 'effect';
import { MapService, MapServiceImpl } from './mapService';
import { MapServiceEffect } from './mapServiceInterface';
import { MapComponentCoreProps } from './types';
export interface MapComponentEffectProps extends MapComponentCoreProps {
    mapServiceLayer?: Layer.Layer<MapService, never, never>;
    onMapServiceReady?: (mapServiceEffect: MapServiceEffect) => void;
    onEffectError?: (error: unknown) => void;
    initializationEffect?: (mapService: MapServiceImpl) => E.Effect<void, Error, never>;
}
export interface MapComponentEffectRef {
    getMapServiceEffect: () => MapServiceEffect | null;
    runEffect: <A, Err>(effect: E.Effect<A, Err, never>) => Promise<A>;
    getMapInstance: () => any;
}
export declare const MapComponentEffect: React.ForwardRefExoticComponent<MapComponentEffectProps & React.RefAttributes<MapComponentEffectRef>>;
