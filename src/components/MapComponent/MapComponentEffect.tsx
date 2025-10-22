import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Effect as E, Runtime, Layer } from 'effect';
import { MapService, MapServiceLayer, LayerType } from './mapService';
import { createMapServiceEffect, MapServiceEffect } from './mapServiceInterface';
import { MapComponentCoreProps } from './types';

// Enhanced props for effect-ts integration
export interface MapComponentEffectProps extends MapComponentCoreProps {
  // Optional external MapServiceLayer for dependency injection
  mapServiceLayer?: Layer.Layer<MapService, never, never>;
  
  // Effect-based event handlers
  onMapServiceReady?: (mapServiceEffect: MapServiceEffect) => void;
  onEffectError?: (error: unknown) => void;
  
  // Initial setup effects
  initializationEffect?: (mapService: MapService) => E.Effect<void, Error, void>;
}

// Enhanced ref interface with effect-ts capabilities
export interface MapComponentEffectRef {
  // Direct access to effect-ts service
  getMapServiceEffect: () => MapServiceEffect | null;
  
  // Execute effects with the service
  runEffect: <A, E, R>(effect: E.Effect<A, E, R>) => Promise<A>;
  
  // Standard operations
  getMapInstance: () => any;
}

// Hook for managing effect-ts runtime with optional external layer
function useMapServiceEffect(
  externalLayer?: Layer.Layer<MapService, never, never>,
  initializationEffect?: (mapService: MapService) => E.Effect<void, Error, void>
) {
  const [mapServiceEffect, setMapServiceEffect] = useState<MapServiceEffect | null>(null);
  const [isReady, setIsReady] = useState(false);
  const runtimeRef = useRef<Runtime.Runtime<never>>(Runtime.defaultRuntime);

  useEffect(() => {
    const runtime = runtimeRef.current;

    const initializeMapService = async () => {
      try {
        const program = E.gen(function* () {
          const service = yield* MapService;
          
          // Run initialization effect if provided
          if (initializationEffect) {
            yield* initializationEffect(service);
          }
          
          return service;
        });

        // Use external layer if provided, otherwise use default
        const serviceLayer = externalLayer || MapServiceLayer;
        const providedProgram = E.provide(program, serviceLayer);
        const service = await runtime.runPromise(providedProgram);
        
        const effectService = createMapServiceEffect(service);
        setMapServiceEffect(effectService);
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize MapService with effect-ts:', error);
        throw error;
      }
    };

    initializeMapService();

    return () => {
      setIsReady(false);
      setMapServiceEffect(null);
    };
  }, [externalLayer, initializationEffect]);

  return { mapServiceEffect, isReady, runtime: runtimeRef.current };
}

// Enhanced MapComponent with effect-ts integration
export const MapComponentEffect = forwardRef<MapComponentEffectRef, MapComponentEffectProps>(({
  id = 'map',
  className,
  style,
  initialCenter = [-98.583333, 39.833333],
  initialZoom = 4,
  mapServiceLayer,
  eventHandlers = {},
  onMapServiceReady,
  onEffectError,
  initializationEffect,
  children,
}, ref) => {
  const { mapServiceEffect, isReady, runtime } = useMapServiceEffect(mapServiceLayer, initializationEffect);
  const [isInitialized, setIsInitialized] = useState(false);

  // Setup effect-ts based initialization
  useEffect(() => {
    if (!mapServiceEffect || !isReady) return;

    const setupMap = async () => {
      try {
        // Set initial map position
        const mapInstance = mapServiceEffect.getMapInstance();
        mapInstance.flyTo({ 
          center: initialCenter, 
          zoom: initialZoom 
        });

        // Register event handlers using effect-ts
        if (eventHandlers.onClick) {
          const effect = mapServiceEffect.registerEventHandlerEffect('click', (e, map) => {
            const cleanEvent = {
              type: 'click',
              originalEvent: (e as any).originalEvent,
              point: (e as any).point,
              lngLat: (e as any).lngLat,
              features: (e as any).features,
              target: map,
            };
            eventHandlers.onClick!(cleanEvent);
          });
          await runtime.runPromise(effect);
        }

        if (eventHandlers.onLoad) {
          const effect = mapServiceEffect.registerEventHandlerEffect('load', () => {
            eventHandlers.onLoad!();
          });
          await runtime.runPromise(effect);
        }

        setIsInitialized(true);
        onMapServiceReady?.(mapServiceEffect);
      } catch (error) {
        console.error('Error setting up effect-ts map:', error);
        onEffectError?.(error);
      }
    };

    setupMap();
  }, [mapServiceEffect, isReady, runtime, initialCenter, initialZoom, eventHandlers, onMapServiceReady, onEffectError]);

  // Expose enhanced imperative API through ref
  useImperativeHandle(ref, () => ({
    getMapServiceEffect: () => mapServiceEffect,
    runEffect: async <A, E, R>(effect: E.Effect<A, E, R>) => {
      if (!mapServiceEffect) throw new Error('MapService not ready');
      return runtime.runPromise(effect);
    },
    getMapInstance: () => {
      if (!mapServiceEffect) throw new Error('MapService not ready');
      return mapServiceEffect.getMapInstance();
    },
  }), [mapServiceEffect, runtime]);

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '400px',
    position: 'relative',
    ...style,
  };

  return (
    <div 
      id={id}
      className={className}
      style={containerStyle}
    >
      {!isReady && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
        }}>
          Loading map with effect-ts...
        </div>
      )}
      {children}
    </div>
  );
});

MapComponentEffect.displayName = 'MapComponentEffect';