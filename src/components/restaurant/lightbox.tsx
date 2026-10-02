"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Full-screen swipeable image viewer (scroll-snap, keyboard arrows). */
export function Lightbox({
  images,
  start,
  onClose,
}: {
  images: string[];
  start: number;
  onClose: () => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(start);

  useEffect(() => {
    const el = track.current;
    if (el) el.scrollTo({ left: start * el.clientWidth, behavior: "instant" });
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [start]);

  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const next = Math.max(0, Math.min(images.length - 1, i));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return createPortal(
    <div
      role="dialog"
      aria-modal
      className="fixed inset-0 z-[60] bg-black/95 text-white"
    >
      <div
        ref={track}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="scrollbar-none flex size-full snap-x snap-mandatory overflow-x-auto"
      >
        {images.map((id) => (
          <div
            key={id}
            className="grid size-full shrink-0 snap-center place-items-center p-4"
          >
            {/* biome-ignore lint/performance/noImgElement: already-optimised uploads */}
            <img
              src={`/uploads/${id}.webp`}
              alt=""
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-white/15 hover:bg-white/25"
      >
        <X className="size-5" />
      </button>
      {images.length > 1 && (
        <>
          <p className="absolute top-6 left-1/2 -translate-x-1/2 text-sm tabular-nums">
            {index + 1} / {images.length}
          </p>
          <button
            type="button"
            aria-label="Previous"
            onClick={() => go(index - 1)}
            className="absolute top-1/2 left-4 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-white/15 hover:bg-white/25 md:grid"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => go(index + 1)}
            className="absolute top-1/2 right-4 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-white/15 hover:bg-white/25 md:grid"
          >
            <ChevronRight className="size-5" />
          </button>
        </>
      )}
    </div>,
    document.body,
  );
}

export function useLightbox() {
  const [state, setState] = useState<{
    images: string[];
    start: number;
  } | null>(null);
  return {
    open: (images: string[], start = 0) => setState({ images, start }),
    element: state && (
      <Lightbox
        images={state.images}
        start={state.start}
        onClose={() => setState(null)}
      />
    ),
  };
}
