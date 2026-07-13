import type { StyleSpecification } from "maplibre-gl";
import type { BasemapConfig } from "./types";

export type BasemapConfigLike =
  | string
  | {
      style?: StyleSpecification;
      tileUrl?: string;
      tileSize?: number;
      attribution?: string;
      minZoom?: number;
      maxZoom?: number;
    };

/** True when the URL is a raster tile template (contains {z} and {x} or {y}). */
export const isTileTemplateUrl = (url: string): boolean =>
  /{z}.*({x}|{y})/.test(url);

/** Extract hostname from an absolute URL, or undefined if parsing fails. */
export const extractHostname = (url: string): string | undefined => {
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
};

const addAbsoluteUrlHostname = (domains: Set<string>, url: string | undefined) => {
  if (!url || !url.startsWith("http")) return;
  const host = extractHostname(url);
  if (host) domains.add(host);
};

/** Collect hostnames from tile, sprite, and glyph URLs in a loaded stylesheet. */
export const collectDomainsFromStylesheet = (stylesheet: StyleSpecification): Set<string> => {
  const domains = new Set<string>();

  for (const source of Object.values(stylesheet.sources ?? {})) {
    if ("tiles" in source && Array.isArray(source.tiles)) {
      source.tiles.forEach((tileUrl) => addAbsoluteUrlHostname(domains, tileUrl));
    }
    if ("url" in source && typeof source.url === "string") {
      addAbsoluteUrlHostname(domains, source.url);
    }
  }

  const sprite = stylesheet.sprite;
  if (typeof sprite === "string") {
    addAbsoluteUrlHostname(domains, sprite);
  } else if (Array.isArray(sprite)) {
    sprite.forEach((entry) => addAbsoluteUrlHostname(domains, entry.url));
  }

  return domains;
};

/** Collect all hostnames associated with a basemap config and optional loaded stylesheet. */
export const collectBasemapDomains = (
  basemapConfig: BasemapConfigLike,
  stylesheet?: StyleSpecification,
): Set<string> => {
  const domains = new Set<string>();

  if (typeof basemapConfig === "string") {
    addAbsoluteUrlHostname(domains, basemapConfig);
  } else if (basemapConfig.tileUrl) {
    addAbsoluteUrlHostname(domains, basemapConfig.tileUrl);
  }

  if (stylesheet) {
    collectDomainsFromStylesheet(stylesheet).forEach((d) => domains.add(d));
  }

  return domains;
};

const domainMatches = (errorUrl: string | undefined, basemapDomains: Set<string>): boolean =>
  !errorUrl ||
  basemapDomains.size === 0 ||
  [...basemapDomains].some((d) => errorUrl.includes(d));

/**
 * Returns true when a MapLibre error event looks like a basemap auth/network failure.
 * Handles 401/403, CORS/network failures (status 0), and missing error URLs during initial load.
 */
export const isBasemapAuthError = (
  status: number | undefined,
  errorUrl: string | undefined,
  basemapDomains: Set<string>,
): boolean => {
  const isAuthStatus = status === 401 || status === 403;
  const isNetworkFailure = status === 0;

  if (!isAuthStatus && !isNetworkFailure) return false;

  return domainMatches(errorUrl, basemapDomains);
};

/** Merge domains from a loaded style into an existing set. */
export const mergeStylesheetDomains = (
  basemapDomains: Set<string>,
  stylesheet: StyleSpecification | undefined,
): void => {
  if (!stylesheet) return;
  collectDomainsFromStylesheet(stylesheet).forEach((d) => basemapDomains.add(d));
};

export type { BasemapConfig };
