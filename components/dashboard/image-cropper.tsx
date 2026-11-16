"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Move, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";

type Props = {
  src: string;
  onCancel: () => void;
  onConfirm: (croppedDataUrl: string) => Promise<void> | void;
};

const OUT_W = 800;
const OUT_H = 400; // 2:1 matches the card figure proportions

export function ImageCropper({ src, onCancel, onConfirm }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [frameSize, setFrameSize] = useState<{ w: number; h: number }>({ w: 380, h: 190 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragStart = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  // Measure the crop frame on mount & resize
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setFrameSize({ w: rect.width, h: rect.height });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Load source image dimensions
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      imgRef.current = img;
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setError(null);
    };
    img.onerror = () => {
      if (!cancelled) setError("Could not load that image.");
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  const baseScale = imgSize
    ? Math.max(frameSize.w / imgSize.w, frameSize.h / imgSize.h)
    : 1;
  const totalScale = baseScale * zoom;
  const rw = imgSize ? imgSize.w * totalScale : frameSize.w;
  const rh = imgSize ? imgSize.h * totalScale : frameSize.h;

  const clampOffset = (x: number, y: number, w = rw, h = rh) => {
    const maxX = Math.max(0, (w - frameSize.w) / 2);
    const maxY = Math.max(0, (h - frameSize.h) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  };

  const clamped = clampOffset(offset.x, offset.y);

  const handleZoomChange = (nextZoom: number) => {
    const z = Math.max(1, Math.min(3, nextZoom));
    setZoom(z);
    if (imgSize) {
      const s = baseScale * z;
      setOffset((o) => clampOffset(o.x, o.y, imgSize.w * s, imgSize.h * s));
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!imgSize || saving) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragStart.current = { px: e.clientX, py: e.clientY, ox: clamped.x, oy: clamped.y };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.px;
    const dy = e.clientY - dragStart.current.py;
    setOffset(clampOffset(dragStart.current.ox + dx, dragStart.current.oy + dy));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    dragStart.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleConfirm = async () => {
    const img = imgRef.current;
    if (!img || !imgSize) return;
    setSaving(true);
    setError(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUT_W;
      canvas.height = OUT_H;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is unavailable.");

      const k = OUT_W / frameSize.w;
      const left = frameSize.w / 2 + clamped.x - rw / 2;
      const top = frameSize.h / 2 + clamped.y - rh / 2;
      ctx.drawImage(img, left * k, top * k, rw * k, rh * k);

      const webp = canvas.toDataURL("image/webp", 0.85);
      const result =
        webp.startsWith("data:image/webp") && webp.length <= 500_000
          ? webp
          : canvas.toDataURL("image/jpeg", 0.82);

      await onConfirm(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not crop image.");
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Drag to position and use the slider to zoom.
        </p>
        <button
          type="button"
          onClick={() => {
            setZoom(1);
            setOffset({ x: 0, y: 0 });
          }}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>

      {/* Crop viewport */}
      <div
        ref={frameRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={(e) => {
          e.preventDefault();
          handleZoomChange(zoom + (e.deltaY < 0 ? 0.12 : -0.12));
        }}
        className={`relative aspect-[2/1] w-full select-none overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 touch-none dark:border-neutral-700 dark:bg-neutral-950 ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        {imgSize && (
          <img
            src={src}
            alt="Crop preview"
            draggable={false}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: rw,
              height: rh,
              maxWidth: "none",
              transform: `translate(calc(-50% + ${clamped.x}px), calc(-50% + ${clamped.y}px))`,
            }}
          />
        )}

        {/* Rule-of-thirds guide */}
        <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-35">
          <div className="border-b border-r border-white/60" />
          <div className="border-b border-r border-white/60" />
          <div className="border-b border-white/60" />
          <div className="border-b border-r border-white/60" />
          <div className="border-b border-r border-white/60" />
          <div className="border-b border-white/60" />
          <div className="border-r border-white/60" />
          <div className="border-r border-white/60" />
          <div />
        </div>

        <div className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] text-white backdrop-blur-xs">
          <Move size={10} /> Drag
        </div>
      </div>

      {/* Zoom slider */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => handleZoomChange(zoom - 0.15)}
          className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          aria-label="Zoom out"
        >
          <ZoomOut size={15} />
        </button>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => handleZoomChange(Number(e.target.value))}
          aria-label="Zoom"
          className="h-1.5 flex-1 cursor-pointer accent-neutral-900 dark:accent-white"
        />
        <button
          type="button"
          onClick={() => handleZoomChange(zoom + 0.15)}
          className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          aria-label="Zoom in"
        >
          <ZoomIn size={15} />
        </button>
        <span className="w-10 text-right text-xs tabular-nums text-neutral-500">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <X size={14} /> Cancel
        </button>
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={!imgSize || saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Confirm upload
        </button>
      </div>
    </div>
  );
}
