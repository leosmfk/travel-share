"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl, { type Map as MBMap, type Marker } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Supercluster from "supercluster";
import type { PointDTO } from "@/lib/types";
import { AddPointFAB } from "./AddPointFAB";
import { Carousel } from "./Carousel";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const MAP_STYLE = process.env.NEXT_PUBLIC_MAPBOX_STYLE ?? "mapbox://styles/mapbox/light-v11";
const DEFAULT_CENTER: [number, number] = [116.397, 39.908];
const DEFAULT_ZOOM = 4;

if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
}

type ClusterProps = { cluster: true; cluster_id: number; point_count: number; point_count_abbreviated: string };
type PointProps = { cluster?: false; point: PointDTO };

export function MapView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MBMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const clusterIndexRef = useRef<Supercluster<PointProps, ClusterProps> | null>(null);
  const [points, setPoints] = useState<PointDTO[]>([]);
  const [openPoints, setOpenPoints] = useState<PointDTO[] | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!MAPBOX_TOKEN) {
      console.error("NEXT_PUBLIC_MAPBOX_TOKEN not set");
      return;
    }
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      projection: "globe",
      renderWorldCopies: false,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }),
      "top-right"
    );
    mapRef.current = map;

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          map.jumpTo({
            center: [pos.coords.longitude, pos.coords.latitude],
            zoom: 12,
          });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    }

    const onChange = () => setTick((t) => t + 1);
    map.on("moveend", onChange);
    map.on("zoomend", onChange);
    map.on("load", onChange);
    return () => {
      map.off("moveend", onChange);
      map.off("zoomend", onChange);
      map.off("load", onChange);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/points", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as PointDTO[];
        if (!cancelled) setPoints(data);
      } catch {}
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const index = new Supercluster<PointProps, ClusterProps>({
      radius: 50,
      maxZoom: 20,
      minPoints: 2,
    });
    const features = points.map((p) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] as [number, number] },
      properties: { point: p },
    }));
    index.load(features);
    clusterIndexRef.current = index;
    setTick((t) => t + 1);
  }, [points]);

  useEffect(() => {
    const map = mapRef.current;
    const index = clusterIndexRef.current;
    if (!map || !index) return;
    const zoom = Math.round(map.getZoom());
    const b = map.getBounds();
    const clusters: ReturnType<typeof index.getClusters> = [];
    if (b) {
      const west = b.getWest();
      const east = b.getEast();
      const south = Math.max(-85, b.getSouth());
      const north = Math.min(85, b.getNorth());
      const lngSpan = west <= east ? east - west : 360 - west + east;
      const padLng = lngSpan * 0.2;
      const padLat = (north - south) * 0.2;
      const s = Math.max(-85, south - padLat);
      const n = Math.min(85, north + padLat);
      if (west <= east) {
        const w = Math.max(-180, west - padLng);
        const e = Math.min(180, east + padLng);
        clusters.push(...index.getClusters([w, s, e, n], zoom));
      } else {
        clusters.push(...index.getClusters([Math.max(-180, west - padLng), s, 180, n], zoom));
        clusters.push(...index.getClusters([-180, s, Math.min(180, east + padLng), n], zoom));
      }
    }

    const existing = markersRef.current;
    const seen = new Set<string>();

    for (const c of clusters) {
      const isCluster = (c.properties as ClusterProps).cluster === true;
      const [lng, lat] = c.geometry.coordinates as [number, number];
      let key: string;
      let leafPoints: PointDTO[];
      let el: HTMLElement;
      if (isCluster) {
        const cp = c.properties as ClusterProps;
        const leaves = index.getLeaves(cp.cluster_id, Infinity) as Array<{ properties: PointProps }>;
        leafPoints = leaves.map((l) => (l.properties as PointProps).point!);
        const ids = leafPoints.map((p) => p.id).sort().join(",");
        key = `c:${ids}`;
      } else {
        const pp = c.properties as PointProps;
        const p = pp.point!;
        leafPoints = [p];
        key = `p:${p.id}`;
      }
      seen.add(key);
      if (existing.has(key)) {
        existing.get(key)!.setLngLat([lng, lat]);
        continue;
      }
      if (leafPoints.length > 1) {
        el = buildClusterEl(leafPoints, () => setOpenPoints(leafPoints));
      } else {
        el = buildSingleEl(leafPoints[0], () => setOpenPoints(leafPoints));
      }
      const wrapper = document.createElement("div");
      wrapper.appendChild(el);
      const marker = new mapboxgl.Marker({ element: wrapper, anchor: "center" })
        .setLngLat([lng, lat])
        .addTo(map);
      existing.set(key, marker);
    }
    for (const [k, m] of existing) {
      if (!seen.has(k)) {
        m.remove();
        existing.delete(k);
      }
    }
  }, [tick]);

  const handleCreated = (p: PointDTO) => {
    setPoints((prev) => [p, ...prev.filter((x) => x.id !== p.id)]);
    mapRef.current?.flyTo({ center: [p.lng, p.lat], zoom: Math.max(mapRef.current.getZoom(), 12) });
  };

  return (
    <div className="fixed inset-0">
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      <AddPointFAB onCreated={handleCreated} mapRef={mapRef} />
      {openPoints ? <Carousel points={openPoints} onClose={() => setOpenPoints(null)} /> : null}
    </div>
  );
}

function buildSingleEl(p: PointDTO, onClick: () => void) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "block cursor-pointer transition-transform duration-150 ease-out active:scale-95";
  btn.style.width = "52px";
  btn.style.height = "52px";
  btn.style.borderRadius = "14px";
  btn.style.border = "3px solid white";
  btn.style.backgroundImage = `url(${p.photoUrl})`;
  btn.style.backgroundSize = "cover";
  btn.style.backgroundPosition = "center";
  btn.style.boxShadow =
    "0 8px 24px -6px rgba(0,0,0,0.35), 0 2px 6px -2px rgba(0,0,0,0.25)";
  btn.setAttribute("aria-label", p.title ?? "Foto");
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick();
  });
  return btn;
}

function buildClusterEl(points: PointDTO[], onClick: () => void) {
  const count = points.length;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "relative block cursor-pointer transition-transform duration-150 ease-out active:scale-95";
  btn.style.width = "64px";
  btn.style.height = "64px";
  btn.setAttribute("aria-label", `${count} fotos`);

  const stack = document.createElement("div");
  stack.className = "relative w-full h-full";

  const top = Math.min(3, count);
  const photos = points.slice(0, top);
  photos.forEach((p, i) => {
    const card = document.createElement("div");
    card.style.position = "absolute";
    card.style.width = "52px";
    card.style.height = "52px";
    card.style.borderRadius = "14px";
    card.style.border = "3px solid white";
    card.style.backgroundImage = `url(${p.photoUrl})`;
    card.style.backgroundSize = "cover";
    card.style.backgroundPosition = "center";
    card.style.boxShadow = "0 8px 24px -6px rgba(0,0,0,0.35), 0 2px 6px -2px rgba(0,0,0,0.25)";
    const offset = (top - 1 - i) * 4;
    const rotate = (i - (top - 1) / 2) * 5;
    card.style.left = `${offset}px`;
    card.style.top = `${offset}px`;
    card.style.transform = `rotate(${rotate}deg)`;
    card.style.zIndex = `${i + 1}`;
    stack.appendChild(card);
  });

  const badge = document.createElement("div");
  badge.style.position = "absolute";
  badge.style.top = "-4px";
  badge.style.right = "-4px";
  badge.style.minWidth = "22px";
  badge.style.height = "22px";
  badge.style.padding = "0 6px";
  badge.style.borderRadius = "999px";
  badge.style.background = "black";
  badge.style.color = "white";
  badge.style.fontSize = "11px";
  badge.style.fontWeight = "600";
  badge.style.display = "flex";
  badge.style.alignItems = "center";
  badge.style.justifyContent = "center";
  badge.style.border = "2px solid white";
  badge.style.boxShadow = "0 4px 12px -2px rgba(0,0,0,0.4)";
  badge.style.zIndex = "20";
  badge.textContent = String(count);

  btn.appendChild(stack);
  btn.appendChild(badge);
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick();
  });
  return btn;
}
