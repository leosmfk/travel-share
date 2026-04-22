"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onCapture: (file: File) => void;
  onCancel: () => void;
};

export function CameraCapture({ onCapture, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
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
  }, []);

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

  return (
    <div className="fixed inset-0 z-40 bg-black flex flex-col">
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className="max-w-full max-h-full object-contain"
        />
        {!ready && !error ? (
          <div className="absolute inset-0 flex items-center justify-center text-white">Carregando câmera...</div>
        ) : null}
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center text-white p-6 text-center">
            {error}
          </div>
        ) : null}
      </div>
      <div className="bg-black p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-4">
        <button type="button" onClick={onCancel} className="text-white text-base">
          Cancelar
        </button>
        <button
          type="button"
          onClick={capture}
          disabled={!ready}
          className="w-18 h-18 rounded-full bg-white border-4 border-white outline outline-4 outline-white/40 disabled:opacity-40"
          style={{ width: 72, height: 72 }}
          aria-label="Tirar foto"
        />
        <div style={{ width: 72 }} />
      </div>
    </div>
  );
}
