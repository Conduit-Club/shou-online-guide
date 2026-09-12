import React, { useCallback, useEffect, useRef, useState } from "react";

import BrowserOnly from "@docusaurus/BrowserOnly";
import { useColorMode } from "@docusaurus/theme-common";
import useBaseUrl, { useBaseUrlUtils } from "@docusaurus/useBaseUrl";

import { campusLayers } from "./campusThemes.js";
import { loadPmtiles } from "./campusOverlay.js";
import "maplibre-gl/dist/maplibre-gl.css";

const DEFAULT_CENTER = [121.9, 30.9];
const DEFAULT_ZOOM = 12;
const DEFAULT_HEIGHT = "420px";
const DEFAULT_LABEL = "OpenStreetMap 地图";
const DEFAULT_PMTILES = "/maps/campus.pmtiles";

let workerConfigured = false;

function formatError(cause) {
  return cause instanceof Error ? cause.message : String(cause);
}

function normalizeCenter(center) {
  if (!Array.isArray(center) || center.length !== 2) return DEFAULT_CENTER;
  const [longitude, latitude] = center.map(Number);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return DEFAULT_CENTER;
  return [longitude, latitude];
}

function createMapStyle(mode) {
  return {
    version: 8,
    glyphs: "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
    sprite: `https://protomaps.github.io/basemaps-assets/sprites/v4/${mode}`,
    sources: {},
    layers: campusLayers("campus", mode).filter((layer) => !layer.source),
  };
}

function MapFallback({ height, label, mapImageUrl, mapPdfUrl, dark }) {
  return (
    <div className={`osm-map${dark ? " osm-map--dark" : ""}`} style={{ height }}>
      <div className="osm-map__fallback" role="region" aria-label={label}>
        <strong>{label}</strong>
        <p>交互地图暂不可用，可查看下方校园总平图。</p>
        <div className="osm-map__fallback-links">
          {mapImageUrl ? <a href={mapImageUrl}>查看校园总平图</a> : null}
          {mapPdfUrl ? <a href={mapPdfUrl}>下载校园总平图 PDF</a> : null}
        </div>
      </div>
    </div>
  );
}

function InteractiveCampusMap({ center, zoom, height, label, pmtiles, dark }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const observerRef = useRef(null);
  const overlayRef = useRef(undefined);
  const styleReadyRef = useRef(false);
  const disposedRef = useRef(false);
  const overlayRequestRef = useRef(0);
  const colorModeRef = useRef(dark ? "dark" : "light");
  const styleModeRef = useRef(dark ? "dark" : "light");
  const pendingStyleModeRef = useRef(null);
  const cameraBeforeStyleRef = useRef(null);
  const pmtilesRef = useRef(pmtiles);
  const initialCenterRef = useRef(center);
  const initialZoomRef = useRef(zoom);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { withBaseUrl } = useBaseUrlUtils();

  const constrainCamera = useCallback(() => {
    const map = mapRef.current;
    const container = containerRef.current;
    const overlay = overlayRef.current;
    if (!map || !container || !overlay) return;

    const { minLon, minLat, maxLon, maxLat, minZoom } = overlay.header;
    const mercatorY = (latitude) => (1 - Math.asinh(Math.tan((latitude * Math.PI) / 180)) / Math.PI) / 2;
    const width = (maxLon - minLon) / 360;
    const mapHeight = mercatorY(minLat) - mercatorY(maxLat);
    if (width <= 0 || mapHeight <= 0 || container.clientWidth <= 0 || container.clientHeight <= 0) return;

    // Cover the viewport, rather than fitting the archive inside it with empty margins.
    const minimum = Math.max(
      minZoom,
      Math.log2(Math.max(container.clientWidth / (512 * width), container.clientHeight / (512 * mapHeight))) + 0.01,
    );
    map.setMinZoom(minimum);
    map.setMaxBounds([
      [minLon, minLat],
      [maxLon, maxLat],
    ]);
  }, []);

  const applyOverlay = useCallback(() => {
    const map = mapRef.current;
    if (!map || !styleReadyRef.current) return;

    for (const layer of map.getStyle().layers ?? []) {
      if (layer.source === "campus") map.removeLayer(layer.id);
    }
    if (map.getSource("campus")) map.removeSource("campus");

    const overlay = overlayRef.current;
    const mode = colorModeRef.current;
    if (overlay) {
      map.addSource("campus", {
        type: "vector",
        url: `pmtiles://${overlay.url}`,
        minzoom: overlay.header.minZoom,
        maxzoom: overlay.header.maxZoom,
        bounds: [overlay.header.minLon, overlay.header.minLat, overlay.header.maxLon, overlay.header.maxLat],
        attribution: overlay.metadata.attribution,
      });
      const available = new Set(overlay.metadata.vector_layers.map((layer) => layer.id));
      for (const layer of campusLayers("campus", mode)) {
        if (layer.source && available.has(layer["source-layer"])) map.addLayer(layer);
      }
      constrainCamera();
      setLoading(false);
    }

    const staticLayers = [
      {
        source: "canteens",
        data: "/maps/canteens.json",
        layers: [
          {
            id: "canteens-point",
            type: "symbol",
            minzoom: 14,
            layout: {
              "text-field": ["get", "label"],
              "text-anchor": "center",
              "text-allow-overlap": true,
              "text-size": 13,
            },
            paint: {
              "text-color": mode === "dark" ? "#dfdfdf" : "#1c1c1e",
              "text-halo-color": mode === "dark" ? "#242424" : "#ffffff",
              "text-halo-width": 1,
            },
          },
        ],
      },
      {
        source: "undergrad-dorms",
        data: "/maps/undergrad-dorms.json",
        layers: [
          {
            id: "undergrad-dorms-point",
            type: "symbol",
            minzoom: 15,
            layout: {
              "text-field": ["get", "label"],
              "text-anchor": "center",
              "text-allow-overlap": true,
              "text-size": 12,
            },
            paint: {
              "text-color": mode === "dark" ? "#efe3c2" : "#5f4700",
              "text-halo-color": mode === "dark" ? "#242424" : "#ffffff",
              "text-halo-width": 1,
            },
          },
        ],
      },
      {
        source: "grad-dorms",
        data: "/maps/grad-dorms.json",
        layers: [
          {
            id: "grad-dorms-point",
            type: "symbol",
            minzoom: 15,
            layout: {
              "text-field": ["get", "label"],
              "text-anchor": "center",
              "text-allow-overlap": true,
              "text-size": 12,
            },
            paint: {
              "text-color": mode === "dark" ? "#efe3c2" : "#5f4700",
              "text-halo-color": mode === "dark" ? "#242424" : "#ffffff",
              "text-halo-width": 1,
            },
          },
        ],
      },
      {
        source: "edu",
        data: "/maps/edu.json",
        layers: [
          {
            id: "edu-point",
            type: "symbol",
            minzoom: 14.5,
            layout: {
              "text-field": ["get", "label"],
              "text-anchor": "center",
              "text-allow-overlap": true,
              "text-size": 13,
            },
            paint: {
              "text-color": mode === "dark" ? "#cde6ff" : "#184c7c",
              "text-halo-color": mode === "dark" ? "#242424" : "#ffffff",
              "text-halo-width": 1,
            },
          },
        ],
      },
      {
        source: "sports",
        data: "/maps/sports.json",
        layers: [
          {
            id: "sports-fill",
            type: "fill",
            minzoom: 14.5,
            filter: ["==", ["geometry-type"], "Polygon"],
            paint: { "fill-color": "#4ccb5e80" },
          },
          {
            id: "sports-point",
            type: "symbol",
            minzoom: 14.5,
            layout: {
              "text-field": ["get", "label"],
              "text-anchor": "center",
              "text-allow-overlap": true,
              "text-size": 14,
            },
            paint: {
              "text-color": mode === "dark" ? "#c2ece3" : "#005548",
              "text-halo-color": mode === "dark" ? "#242424" : "#ffffff",
              "text-halo-width": 1,
            },
          },
        ],
      },
      {
        source: "gates",
        data: "/maps/gates.json",
        layers: [
          {
            id: "gates-point",
            type: "symbol",
            minzoom: 13,
            layout: {
              "text-field": ["get", "label"],
              "text-anchor": "center",
              "text-allow-overlap": true,
              "text-size": 14,
            },
            paint: {
              "text-color": mode === "dark" ? "#dfdfdf" : "#1c1c1e",
              "text-halo-color": mode === "dark" ? "#242424" : "#ffffff",
              "text-halo-width": 1,
            },
          },
        ],
      },
      {
        source: "public-transport",
        data: "/maps/public-transport.json",
        layers: [
          {
            id: "public-transport-point",
            type: "symbol",
            minzoom: 13,
            layout: {
              "text-field": ["get", "label"],
              "text-anchor": "center",
              "text-allow-overlap": true,
              "text-size": 13,
            },
            paint: {
              "text-color": mode === "dark" ? "#e2c9ff" : "#6b21a8",
              "text-halo-color": mode === "dark" ? "#242424" : "#ffffff",
              "text-halo-width": 1,
            },
          },
        ],
      },
      {
        source: "other",
        data: "/maps/other.json",
        layers: [
          {
            id: "other-point",
            type: "symbol",
            minzoom: 16,
            layout: {
              "text-field": ["get", "label"],
              "text-anchor": "center",
              "text-allow-overlap": true,
              "text-size": 10,
            },
            paint: {
              "text-color": mode === "dark" ? "#dfdfdf" : "#1c1c1e",
              "text-halo-color": mode === "dark" ? "#242424" : "#ffffff",
              "text-halo-width": 1,
            },
          },
        ],
      },
      {
        source: "university",
        data: "/maps/university.json",
        layers: [
          {
            id: "university-point",
            type: "symbol",
            maxzoom: 14.5,
            layout: {
              "text-field": ["get", "label"],
              "text-anchor": "center",
              "text-allow-overlap": true,
              "text-size": 16,
            },
            paint: {
              "text-color": mode === "dark" ? "#dfdfdf" : "#1c1c1e",
              "text-halo-color": mode === "dark" ? "#242424" : "#ffffff",
              "text-halo-width": 1,
            },
          },
        ],
      },
    ];

    for (const definition of staticLayers) {
      if (!map.getSource(definition.source)) {
        map.addSource(definition.source, {
          type: "geojson",
          data: withBaseUrl(definition.data),
        });
      }
      for (const layer of definition.layers) {
        if (!map.getLayer(layer.id)) map.addLayer({ ...layer, source: definition.source });
      }
      for (const layer of definition.layers) {
        if (map.getLayer(layer.id)) map.moveLayer(layer.id);
      }
    }

    // Keep polygon fills above the basemap and below campus labels after overlay updates.
    if (map.getLayer("sports-fill") && map.getLayer("canteens-point")) {
      map.moveLayer("sports-fill", "canteens-point");
    }
    if (map.getLayer("sports-point")) map.moveLayer("sports-point");
    if (map.getLayer("gates-point")) map.moveLayer("gates-point");
    if (map.getLayer("public-transport-point")) map.moveLayer("public-transport-point");
    if (map.getLayer("other-point")) map.moveLayer("other-point");
    if (map.getLayer("university-point")) map.moveLayer("university-point");
  }, [constrainCamera, withBaseUrl]);

  const updateOverlay = useCallback(
    async (requestedPath) => {
      const request = ++overlayRequestRef.current;
      overlayRef.current = undefined;
      setLoading(true);
      setError("");
      applyOverlay();

      try {
        if (!requestedPath) throw new Error("请指定 PMTiles 文件");
        const { protocol, PMTiles } = await loadPmtiles(withBaseUrl("/maplibre/maplibre-gl.mjs"));
        if (disposedRef.current || request !== overlayRequestRef.current) return;

        const path =
          requestedPath.startsWith("/") && !requestedPath.startsWith("//") ? withBaseUrl(requestedPath) : requestedPath;
        const url = new URL(path, window.location.href).href;
        const archive = new PMTiles(url);
        const [header, metadata] = await Promise.all([archive.getHeader(), archive.getMetadata()]);
        if (disposedRef.current || request !== overlayRequestRef.current) return;
        if (header.tileType !== 1 || !Array.isArray(metadata.vector_layers)) {
          throw new Error("需要 Protomaps 矢量 PMTiles 文件");
        }
        protocol.add(archive);
        overlayRef.current = { url, header, metadata };
        applyOverlay();
      } catch (cause) {
        if (!disposedRef.current && request === overlayRequestRef.current) {
          setLoading(false);
          setError(`校园地图加载失败：${formatError(cause)}`);
        }
      }
    },
    [applyOverlay, withBaseUrl],
  );

  useEffect(() => {
    pmtilesRef.current = pmtiles;
    if (mapRef.current) void updateOverlay(pmtiles);
  }, [pmtiles, updateOverlay]);

  useEffect(() => {
    disposedRef.current = false;
    let cancelled = false;

    async function initialize() {
      try {
        const { maplibre } = await loadPmtiles(withBaseUrl("/maplibre/maplibre-gl.mjs"));
        if (cancelled || disposedRef.current || !containerRef.current) return;
        const { Map, NavigationControl, FullscreenControl, setWorkerUrl } = maplibre;
        if (!workerConfigured && typeof setWorkerUrl === "function") {
          setWorkerUrl(withBaseUrl("/maplibre/maplibre-gl-worker.mjs"));
          workerConfigured = true;
        }

        const map = new Map({
          container: containerRef.current,
          style: createMapStyle(colorModeRef.current),
          localIdeographFontFamily: '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif',
          center: initialCenterRef.current,
          zoom: initialZoomRef.current,
          attributionControl: { compact: false },
          renderWorldCopies: false,
          dragRotate: false,
          pitchWithRotate: false,
          maxPitch: 0,
          touchPitch: false,
        });
        mapRef.current = map;
        map.addControl(new NavigationControl());
        map.addControl(new FullscreenControl());
        map.touchZoomRotate.disableRotation();
        map.keyboard.disableRotation();
        map.on("style.load", () => {
          if (disposedRef.current) return;
          styleReadyRef.current = true;
          const pendingMode = pendingStyleModeRef.current;
          pendingStyleModeRef.current = null;
          if (pendingMode && pendingMode !== styleModeRef.current) {
            styleReadyRef.current = false;
            styleModeRef.current = pendingMode;
            map.setStyle(createMapStyle(pendingMode), { diff: false });
            return;
          }
          const camera = cameraBeforeStyleRef.current;
          if (camera) {
            cameraBeforeStyleRef.current = null;
            map.jumpTo(camera);
          }
          applyOverlay();
        });
        map.on("error", () => {
          if (!disposedRef.current) {
            setLoading(false);
            setError("部分地图资源加载失败，请检查网络连接后刷新页面。");
          }
        });

        if (typeof ResizeObserver === "function") {
          observerRef.current = new ResizeObserver(() => {
            if (!disposedRef.current) {
              map.resize();
              constrainCamera();
            }
          });
          observerRef.current.observe(containerRef.current);
        }
        void updateOverlay(pmtilesRef.current);
      } catch (cause) {
        if (cancelled || disposedRef.current) return;
        observerRef.current?.disconnect();
        mapRef.current?.remove();
        mapRef.current = null;
        setLoading(false);
        setError(`无法加载地图：${formatError(cause)}`);
      }
    }

    void initialize();
    return () => {
      cancelled = true;
      disposedRef.current = true;
      overlayRequestRef.current += 1;
      observerRef.current?.disconnect();
      observerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      styleReadyRef.current = false;
    };
  }, [applyOverlay, constrainCamera, updateOverlay]);

  const centerKey = `${center[0]},${center[1]}`;
  useEffect(() => {
    const map = mapRef.current;
    if (map) map.jumpTo({ center, zoom });
  }, [centerKey, zoom]);

  useEffect(() => {
    const mode = dark ? "dark" : "light";
    colorModeRef.current = mode;
    const map = mapRef.current;
    if (!map) return;
    if (!styleReadyRef.current) {
      pendingStyleModeRef.current = mode;
      return;
    }
    if (styleModeRef.current === mode) return;
    cameraBeforeStyleRef.current = {
      center: map.getCenter(),
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: map.getPitch(),
    };
    styleModeRef.current = mode;
    styleReadyRef.current = false;
    setLoading(true);
    setError("");
    // Replacing the style keeps the current camera; the explicit snapshot above
    // also protects it across MapLibre and theme upgrades.
    map.setStyle(createMapStyle(mode), { diff: false });
  }, [dark, applyOverlay]);

  return (
    <div className={`osm-map${dark ? " osm-map--dark" : ""}`} style={{ height }}>
      <div ref={containerRef} className="osm-map__canvas" role="region" aria-label={label} />
      {error ? (
        <p className="osm-map__error" role="alert">
          {error}
        </p>
      ) : loading ? (
        <p className="osm-map__status" role="status">
          正在加载地图…
        </p>
      ) : null}
    </div>
  );
}

export default function CampusMap({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  height = DEFAULT_HEIGHT,
  label = DEFAULT_LABEL,
  pmtiles = DEFAULT_PMTILES,
}) {
  const { colorMode } = useColorMode();
  const normalizedCenter = normalizeCenter(center);
  const mapImageUrl = useBaseUrl("/assets/campus-map-202509.jpg");
  const mapPdfUrl = useBaseUrl("/assets/campus-map-202509.pdf");
  const dark = colorMode === "dark";

  return (
    <BrowserOnly
      fallback={
        <MapFallback height={height} label={label} mapImageUrl={mapImageUrl} mapPdfUrl={mapPdfUrl} dark={dark} />
      }
    >
      {() => (
        <InteractiveCampusMap
          center={normalizedCenter}
          zoom={zoom}
          height={height}
          label={label}
          pmtiles={pmtiles}
          dark={dark}
        />
      )}
    </BrowserOnly>
  );
}
