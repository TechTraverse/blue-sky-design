import { describe, expect, it } from "vitest";
import type { StyleSpecification } from "maplibre-gl";
import {
  collectBasemapDomains,
  collectDomainsFromStylesheet,
  extractHostname,
  isBasemapAuthError,
  isTileTemplateUrl,
  mergeStylesheetDomains,
} from "./basemapFallback";

const STYLE_API_URL =
  "https://basemapstyles-api.arcgis.com/arcgis/rest/services/styles/v2/styles/arcgis/imagery/standard?token=test";

const TILE_URL =
  "https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

describe("isTileTemplateUrl", () => {
  it("detects tile URL templates", () => {
    expect(isTileTemplateUrl(TILE_URL)).toBe(true);
    expect(isTileTemplateUrl("https://tile.openstreetmap.org/{z}/{x}/{y}.png")).toBe(true);
  });

  it("returns false for style JSON URLs", () => {
    expect(isTileTemplateUrl(STYLE_API_URL)).toBe(false);
  });
});

describe("extractHostname", () => {
  it("extracts hostname from absolute URLs", () => {
    expect(extractHostname(STYLE_API_URL)).toBe("basemapstyles-api.arcgis.com");
    expect(extractHostname(TILE_URL)).toBe("ibasemaps-api.arcgis.com");
  });

  it("returns undefined for invalid URLs", () => {
    expect(extractHostname("not-a-url")).toBeUndefined();
  });
});

describe("collectBasemapDomains", () => {
  it("includes style API hostname from config URL", () => {
    const domains = collectBasemapDomains(STYLE_API_URL);
    expect(domains.has("basemapstyles-api.arcgis.com")).toBe(true);
  });

  it("merges tile hostnames from loaded stylesheet", () => {
    const stylesheet: StyleSpecification = {
      version: 8,
      sources: {
        imagery: {
          type: "raster",
          tiles: [TILE_URL],
          tileSize: 256,
        },
      },
      layers: [{ id: "imagery", type: "raster", source: "imagery" }],
    };

    const domains = collectBasemapDomains(STYLE_API_URL, stylesheet);
    expect(domains.has("basemapstyles-api.arcgis.com")).toBe(true);
    expect(domains.has("ibasemaps-api.arcgis.com")).toBe(true);
  });
});

describe("collectDomainsFromStylesheet", () => {
  it("collects hostnames from tiles, glyphs, and sprite", () => {
    const stylesheet: StyleSpecification = {
      version: 8,
      glyphs: "https://static.arcgis.com/fonts/{fontstack}/{range}.pbf",
      sprite: "https://static.arcgis.com/sprites/sprite",
      sources: {
        imagery: {
          type: "raster",
          tiles: [TILE_URL],
          tileSize: 256,
        },
      },
      layers: [{ id: "imagery", type: "raster", source: "imagery" }],
    };

    const domains = collectDomainsFromStylesheet(stylesheet);
    expect(domains.has("ibasemaps-api.arcgis.com")).toBe(true);
    expect(domains.has("static.arcgis.com")).toBe(true);
  });
});

describe("mergeStylesheetDomains", () => {
  it("adds stylesheet domains to an existing set", () => {
    const domains = collectBasemapDomains(STYLE_API_URL);
    const stylesheet: StyleSpecification = {
      version: 8,
      sources: {
        imagery: {
          type: "raster",
          tiles: [TILE_URL],
          tileSize: 256,
        },
      },
      layers: [{ id: "imagery", type: "raster", source: "imagery" }],
    };

    mergeStylesheetDomains(domains, stylesheet);
    expect(domains.has("ibasemaps-api.arcgis.com")).toBe(true);
  });
});

describe("isBasemapAuthError", () => {
  const styleDomains = collectBasemapDomains(STYLE_API_URL);
  const styleAndTileDomains = collectBasemapDomains(STYLE_API_URL, {
    version: 8,
    sources: {
      imagery: { type: "raster", tiles: [TILE_URL], tileSize: 256 },
    },
    layers: [{ id: "imagery", type: "raster", source: "imagery" }],
  });

  it("returns true for 403 on style API URL", () => {
    expect(isBasemapAuthError(403, STYLE_API_URL, styleDomains)).toBe(true);
  });

  it("returns true for status 0 on style API URL (CORS/network failure)", () => {
    expect(isBasemapAuthError(0, STYLE_API_URL, styleDomains)).toBe(true);
  });

  it("returns true for 403 on tile URL when stylesheet domains are known", () => {
    expect(isBasemapAuthError(403, TILE_URL, styleAndTileDomains)).toBe(true);
  });

  it("returns false for tile 403 when only style domain is known", () => {
    expect(isBasemapAuthError(403, TILE_URL, styleDomains)).toBe(false);
  });

  it("returns false for unrelated domain", () => {
    expect(
      isBasemapAuthError(403, "https://example.com/tiles/{z}/{x}/{y}", styleDomains),
    ).toBe(false);
  });

  it("returns false for non-auth status codes", () => {
    expect(isBasemapAuthError(404, STYLE_API_URL, styleDomains)).toBe(false);
    expect(isBasemapAuthError(500, STYLE_API_URL, styleDomains)).toBe(false);
  });
});
