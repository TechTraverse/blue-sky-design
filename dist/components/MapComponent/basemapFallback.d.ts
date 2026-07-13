import { StyleSpecification } from 'maplibre-gl';
import { BasemapConfig } from './types';
export type BasemapConfigLike = string | {
    style?: StyleSpecification;
    tileUrl?: string;
    tileSize?: number;
    attribution?: string;
    minZoom?: number;
    maxZoom?: number;
};
/** True when the URL is a raster tile template (contains {z} and {x} or {y}). */
export declare const isTileTemplateUrl: (url: string) => boolean;
/** Extract hostname from an absolute URL, or undefined if parsing fails. */
export declare const extractHostname: (url: string) => string | undefined;
/** Collect hostnames from tile, sprite, and glyph URLs in a loaded stylesheet. */
export declare const collectDomainsFromStylesheet: (stylesheet: StyleSpecification) => Set<string>;
/** Collect all hostnames associated with a basemap config and optional loaded stylesheet. */
export declare const collectBasemapDomains: (basemapConfig: BasemapConfigLike, stylesheet?: StyleSpecification) => Set<string>;
/**
 * Returns true when a MapLibre error event looks like a basemap auth/network failure.
 * Handles 401/403, CORS/network failures (status 0), and missing error URLs during initial load.
 */
export declare const isBasemapAuthError: (status: number | undefined, errorUrl: string | undefined, basemapDomains: Set<string>) => boolean;
/** Merge domains from a loaded style into an existing set. */
export declare const mergeStylesheetDomains: (basemapDomains: Set<string>, stylesheet: StyleSpecification | undefined) => void;
export type { BasemapConfig };
