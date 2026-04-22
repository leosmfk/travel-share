"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "motion/react";
import type { PointDTO } from "@/lib/types";

type Props = {
  points: PointDTO[];
  initialIndex?: number;
  onClose: () => void;
};

const SPRING = { type: "spring" as const, duration: 0.35, bounce: 0.15 };
const EASE = [0.23, 1, 0.32, 1] as const;

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = now - then;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < day && diff >= 0) {
    if (diff < minute) return "agora";
    if (diff < hour) {
      const m = Math.floor(diff / minute);
      return `há ${m} ${m === 1 ? "minuto" : "minutos"}`;
    }
    const h = Math.floor(diff / hour);
    return `há ${h} ${h === 1 ? "hora" : "horas"}`;
  }
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

export function Carousel({ points, initialIndex = 0, onClose }: Props) {
  const [idx, setIdx] = useState(Math.min(initialIndex, points.length - 1));
  const [mounted, setMounted] = useState(false);
  const reduce = useReducedMotion();

  const total = points.length;
  const next = useCallback(() => setIdx((i) => (i + 1) % total), [total]);
  const prev = useCallback(() => setIdx((i) => (i - 1 + total) % total), [total]);

  useEffect(() => {
    const r = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(r);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, onClose]);

  if (total === 0) return null;

  const visible = total === 1 ? [0] : total === 2 ? [0, 1] : [-1, 0, 1];

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x < -threshold || info.velocity.x < -400) next();
    else if (info.offset.x > threshold || info.velocity.x > 400) prev();
  };

  const current = points[idx];

  return (
    <AnimatePresence>
      <div
        key="carousel"
        className="fixed inset-0 z-30 flex flex-col items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          aria-hidden
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
          style={{
            background:
              "radial-gradient(120% 80% at 50% 40%, rgba(30,24,30,0.85) 0%, rgba(8,6,10,0.96) 60%, rgba(0,0,0,0.98) 100%)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        />
        <div
          className="relative"
          style={{
            width: "min(80vw, 360px)",
            aspectRatio: "3 / 4",
            perspective: 1400,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {visible.map((offset) => {
            const realIdx = (idx + offset + total) % total;
            const p = points[realIdx];
            const isCenter = offset === 0;
            const xPct = reduce ? 0 : offset * 20;
            const rot = reduce ? 0 : offset * 3;
            const scale = isCenter ? 1 : 0.84;
            const op = isCenter ? 1 : 0.5;
            return (
              <motion.div
                key={p.id}
                className="absolute inset-0 rounded-[28px] overflow-hidden will-change-transform"
                style={{
                  zIndex: 10 - Math.abs(offset),
                  touchAction: isCenter ? "none" : "auto",
                  boxShadow: isCenter
                    ? "0 30px 80px -20px rgba(0,0,0,0.65), 0 10px 30px -10px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.06)"
                    : "0 20px 50px -20px rgba(0,0,0,0.55)",
                }}
                initial={
                  mounted
                    ? false
                    : { transform: `translateX(${xPct}%) scale(0.92) rotate(${rot}deg)`, opacity: 0 }
                }
                animate={{
                  transform: `translateX(${xPct}%) scale(${scale}) rotate(${rot}deg)`,
                  opacity: op,
                }}
                transition={{ ...SPRING, delay: Math.abs(offset) * 0.04 }}
                drag={isCenter ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.25}
                dragTransition={{ bounceStiffness: 400, bounceDamping: 30 }}
                onDragEnd={isCenter ? onDragEnd : undefined}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.photoUrl}
                  alt=""
                  draggable={false}
                  className="w-full h-full object-cover pointer-events-none select-none"
                />
              </motion.div>
            );
          })}
        </div>

        <motion.div
          key={`ts-${current.id}`}
          className="mt-4 text-white/70 text-[13px] tracking-tight tabular-nums text-left"
          style={{ width: "min(80vw, 360px)" }}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: EASE }}
          onClick={(e) => e.stopPropagation()}
        >
          {formatRelative(current.createdAt)}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15, ease: EASE }}
          onClick={(e) => e.stopPropagation()}
          className="mt-6 flex flex-col items-center gap-8"
          style={{ marginBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          {total > 1 ? (
            <div className="flex items-center gap-1 rounded-full bg-white/8 backdrop-blur-2xl border border-white/10 p-1 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)]">
              <button
                type="button"
                onClick={prev}
                aria-label="Anterior"
                className="w-11 h-11 rounded-full flex items-center justify-center text-white text-xl transition-all duration-150 ease-out active:scale-[0.94] hover:bg-white/10"
              >
                ‹
              </button>
              <div className="px-4 text-white/90 text-sm tabular-nums font-medium min-w-[48px] text-center">
                {idx + 1}
                <span className="text-white/40"> / {total}</span>
              </div>
              <button
                type="button"
                onClick={next}
                aria-label="Próxima"
                className="w-11 h-11 rounded-full flex items-center justify-center text-white text-xl transition-all duration-150 ease-out active:scale-[0.94] hover:bg-white/10"
              >
                ›
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Fechar"
            className="w-11 h-11 rounded-full flex items-center justify-center text-white/90 text-xl bg-white/8 backdrop-blur-2xl border border-white/10 transition-transform duration-150 ease-out active:scale-[0.94] hover:bg-white/15"
          >
            ×
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
