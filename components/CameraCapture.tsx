"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onCapture: (file: File) => void;
  onCancel: () => void;
};

type Facing = "environment" | "user";

export function CameraCapture({ onCapture, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [facing, setFacing] = useState<Facing>("environment");

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      setReady(false);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          setReady(true);
        }
      } catch (e) {
        setError((e as Error).message || "Erro ao acessar câmera");
      }
    };
    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [facing]);

  const capture = async () => {
    const video = videoRef.current;
    if (!video || !ready) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (facing === "user") {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);
    const blob: Blob | null = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9);
    });
    if (!blob) {
      setError("Falha capturar foto");
      return;
    }
    const file = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
    onCapture(file);
  };

  const flip = () => setFacing((f) => (f === "environment" ? "user" : "environment"));

  return (
    <div className="fixed inset-0 z-40 bg-black flex flex-col">
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className="max-w-full max-h-full object-contain"
          style={facing === "user" ? { transform: "scaleX(-1)" } : undefined}
        />
        {!ready && !error ? (
          <div className="absolute inset-0 flex items-center justify-center" aria-label="Carregando câmera" role="status">
            <span className="w-8 h-8 border-2 border-white/25 border-t-white rounded-full animate-spin" />
          </div>
        ) : null}
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center text-white p-6 text-center">
            {error}
          </div>
        ) : null}
      </div>
      <div className="bg-black px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancelar"
          className="w-11 h-11 rounded-full flex items-center justify-center text-white/90 bg-white/8 border border-white/10 transition-transform duration-150 ease-out active:scale-[0.94] hover:bg-white/15"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 6l12 12" />
            <path d="M18 6L6 18" />
          </svg>
        </button>
        <button
          type="button"
          onClick={capture}
          disabled={!ready}
          className="rounded-full bg-white border-4 border-white outline outline-4 outline-white/40 disabled:opacity-40 active:scale-[0.94] transition-transform duration-150 ease-out"
          style={{ width: 72, height: 72 }}
          aria-label="Tirar foto"
        />
        <button
          type="button"
          onClick={flip}
          aria-label="Virar câmera"
          className="w-11 h-11 rounded-full flex items-center justify-center text-white/90 bg-white/8 border border-white/10 transition-transform duration-150 ease-out active:scale-[0.94] hover:bg-white/15"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
            <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M3 21v-5h5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
