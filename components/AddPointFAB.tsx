"use client";

import { useState, type RefObject } from "react";
import type { Map as MBMap } from "mapbox-gl";
import exifr from "exifr";
import type { PointDTO } from "@/lib/types";
import { CameraCapture } from "./CameraCapture";

type Props = {
  onCreated: (p: PointDTO) => void;
  mapRef: RefObject<MBMap | null>;
};

type Stage = "idle" | "camera" | "uploading";

export function AddPointFAB({ onCreated, mapRef }: Props) {
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);

  const onCaptured = async (file: File) => {
    setError(null);
    setStage("uploading");
    try {
      const coords = await resolveCoords(file, mapRef.current);
      if (!coords) throw new Error("Localização indisponível");
      const dims = await readImageDims(file);
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const contentType = file.type || "image/jpeg";

      const presignRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contentType, ext }),
      });
      if (!presignRes.ok) throw new Error("Falha presign");
      const { key, uploadUrl } = (await presignRes.json()) as { key: string; uploadUrl: string };

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "content-type": contentType },
        body: file,
      });
      if (!putRes.ok) throw new Error("Falha upload");

      const createRes = await fetch("/api/points", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lat: coords.lat,
          lng: coords.lng,
          photoKey: key,
          photoWidth: dims?.width ?? null,
          photoHeight: dims?.height ?? null,
        }),
      });
      if (!createRes.ok) throw new Error("Falha salvar");
      const created = (await createRes.json()) as PointDTO;
      onCreated(created);
      setStage("idle");
    } catch (e) {
      setError((e as Error).message);
      setStage("idle");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setStage("camera")}
        disabled={stage === "uploading"}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 w-16 h-16 rounded-full bg-black text-white text-3xl shadow-xl active:scale-95 transition-transform flex items-center justify-center disabled:opacity-60"
        style={{ bottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        aria-label="Adicionar ponto"
      >
        {stage === "uploading" ? (
          <span className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        ) : (
          "+"
        )}
      </button>

      {stage === "camera" ? (
        <CameraCapture onCapture={onCaptured} onCancel={() => setStage("idle")} />
      ) : null}

      {error ? (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 bg-red-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
          {error}
        </div>
      ) : null}
    </>
  );
}

async function resolveCoords(file: File, map: MBMap | null): Promise<{ lat: number; lng: number } | null> {
  try {
    const gps = await exifr.gps(file);
    if (gps && typeof gps.latitude === "number" && typeof gps.longitude === "number") {
      return { lat: gps.latitude, lng: gps.longitude };
    }
  } catch {}
  if ("geolocation" in navigator) {
    const coords = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
    if (coords) return coords;
  }
  if (map) {
    const c = map.getCenter();
    return { lat: c.lat, lng: c.lng };
  }
  return null;
}

function readImageDims(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}
