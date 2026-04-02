import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Effect as E } from 'effect';
import { MapService, MapServiceLayer, createMapServiceLayer, MapClassWrapper } from './mapService';
import type { BasemapFallbackOptions } from './types';
import { MapServiceAdapter } from './mapServiceInterface';
import type { MapComponentCoreProps, MapComponentCallbacks, MapOperations, SourceConfig } from './types';
import type { Map as MapLibreMap } from 'maplibre-gl';

// Core MapComponent props - React-only API
export interface MapComponentProps extends MapComponentCoreProps, MapComponentCallbacks {
  // Optional layers to add on mount
  initialLayers?: Array<{
    id: string;
    type: 'basemap' | 'overlay';
    url?: string;
    sourceConfig?: SourceConfig;
  }>;
}

// Ref interface for imperative API
export interface MapComponentRef extends MapOperations {
  getMapInstance: () => MapLibreMap;
}

// Internal hook for managing effect-ts runtime
function useMapService(fallbackOptions?: BasemapFallbackOptions) {
  const [mapService, setMapService] = useState<MapServiceAdapter | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Initialize MapService
    const initializeMapService = async () => {
      try {
        const program = E.gen(function* () {
          const service = yield* MapService;
          return service;
        });

        // Use custom layer with fallback options if provided
        const serviceLayer = fallbackOptions
          ? createMapServiceLayer({ fallbackOptions })
          : MapServiceLayer;
        const providedProgram = E.provide(program, serviceLayer);
        const service = await E.runPromise(providedProgram);

        const adapter = new MapServiceAdapter(service);
        setMapService(adapter);
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize MapService:', error);
      }
    };

    initializeMapService();

    return () => {
      // Cleanup: reset singleton so next mount creates fresh instance
      MapClassWrapper.resetInstance();
      setIsReady(false);
      setMapService(null);
    };
  }, [fallbackOptions]);

  return { mapService, isReady };
}

// Main MapComponent implementation
export const MapComponent = forwardRef<MapComponentRef, MapComponentProps>(({
  id = 'map',
  className,
  style,
  initialCenter = [-104.9903, 39.7392], // Denver, CO
  initialZoom = 4,
  initialBasemap = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  initialLayers = [],
  fallbackOptions,
  eventHandlers = {},
  onLayerAdd,
  onLayerRemove,
  onLayerUpdate,
  onBasemapChange,
  onMapReady,
  onMapError,
  children,
}, ref) => {
  const { mapService, isReady } = useMapService(fallbackOptions);
  const cleanupFunctionsRef = useRef<Array<() => void>>([]);

  // Setup event handlers and initialization
  useEffect(() => {
    if (!mapService || !isReady) return;

    const setupEventHandlers = async () => {
      try {
        // Register event handlers
        if (eventHandlers.onClick) {
          const cleanup = await mapService.registerEventHandler('click', eventHandlers.onClick);
          cleanupFunctionsRef.current.push(cleanup);
        }

        if (eventHandlers.onMouseMove) {
          const cleanup = await mapService.registerEventHandler('mousemove', eventHandlers.onMouseMove);
          cleanupFunctionsRef.current.push(cleanup);
        }

        if (eventHandlers.onLoad) {
          const cleanup = await mapService.registerEventHandler('load', eventHandlers.onLoad);
          cleanupFunctionsRef.current.push(cleanup);
        }

        // Set initial map position
        if (initialCenter || initialZoom) {
          await mapService.flyTo({ 
            center: initialCenter, 
            zoom: initialZoom 
          });
        }

        // Initialize with basemap
        const basemapUrl = typeof initialBasemap === 'string' ? initialBasemap : (initialBasemap.tileUrl || 'custom');
        await mapService.setBasemap(initialBasemap);
        onBasemapChange?.(basemapUrl);

        // Add initial layers
        for (const layer of initialLayers) {
          const layerConfig = {
            id: layer.id,
            type: layer.type,
            sourceConfig: layer.sourceConfig,
          };
          await mapService.addLayer(layerConfig);
          onLayerAdd?.(layerConfig);
        }

        onMapReady?.();
      } catch (error) {
        console.error('Error setting up map:', error);
        onMapError?.(error as Error);
      }
    };

    setupEventHandlers();

    return () => {
      // Cleanup event handlers
      cleanupFunctionsRef.current.forEach(cleanup => cleanup());
      cleanupFunctionsRef.current = [];
    };
  }, [mapService, isReady, eventHandlers, initialBasemap, initialLayers, onMapReady, onMapError, onBasemapChange, onLayerAdd, initialCenter, initialZoom]);

  // Expose imperative API through ref
  useImperativeHandle(ref, () => ({
    addLayer: async (layer, above) => {
      if (!mapService) throw new Error('MapService not ready');
      await mapService.addLayer(layer, above);
      onLayerAdd?.(layer);
    },
    removeLayer: async (layerId) => {
      if (!mapService) throw new Error('MapService not ready');
      await mapService.removeLayer(layerId);
      onLayerRemove?.(layerId);
    },
    updateLayer: async (layer) => {
      if (!mapService) throw new Error('MapService not ready');
      await mapService.updateLayer(layer);
      onLayerUpdate?.(layer);
    },
    setBasemap: async (basemapUrl) => {
      if (!mapService) throw new Error('MapService not ready');
      await mapService.setBasemap(basemapUrl);
      const url = typeof basemapUrl === 'string' ? basemapUrl : (basemapUrl.tileUrl || 'custom');
      onBasemapChange?.(url);
    },
    zoomTo: async (bounds) => {
      if (!mapService) throw new Error('MapService not ready');
      await mapService.zoomTo(bounds);
    },
    flyTo: async (options) => {
      if (!mapService) throw new Error('MapService not ready');
      await mapService.flyTo(options);
    },
    queryRenderedFeatures: async (point) => {
      if (!mapService) throw new Error('MapService not ready');
      return mapService.queryRenderedFeatures(point);
    },
    getSource: (sourceId) => {
      if (!mapService) throw new Error('MapService not ready');
      return mapService.getSource(sourceId);
    },
    getLayer: (layerId) => {
      if (!mapService) throw new Error('MapService not ready');
      return mapService.getLayer(layerId);
    },
    getMapInstance: () => {
      if (!mapService) throw new Error('MapService not ready');
      return mapService.getMapInstance();
    },
  }), [mapService, onLayerAdd, onLayerRemove, onLayerUpdate, onBasemapChange]);

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
          Loading map...
        </div>
      )}
      {children}
    </div>
  );
});

MapComponent.displayName = 'MapComponent';