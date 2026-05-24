"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface Photo {
  url: string;
  alt: string;
}

interface Props {
  photos: Photo[];
}

export default function PhotoGalleryLightbox({ photos }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [current, setCurrent] = useState(0);

  const openAt = (index: number) => {
    setCurrent(index);
    dialogRef.current?.showModal();
  };

  const close = () => dialogRef.current?.close();

  const prev = useCallback(() => setCurrent((c) => (c - 1 + photos.length) % photos.length), [photos.length]);
  const next = useCallback(() => setCurrent((c) => (c + 1) % photos.length), [photos.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!dialogRef.current?.open) return;
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [prev, next]);

  if (photos.length === 0) return null;

  const cover = photos[0];
  const thumbs = photos.slice(1, 3); // show up to 2 thumbs on the right
  const hasMore = photos.length > 3;

  const gridColumns = thumbs.length > 0 ? "1.6fr 1fr" : "1fr";

  return (
    <>
      {/* Gallery */}
      <div className="grid max-h-[480px] gap-2 overflow-hidden rounded-xl" style={{ gridTemplateColumns: gridColumns }}>
        {/* Cover */}
        <button
          type="button"
          onClick={() => openAt(0)}
          className="block h-full cursor-pointer border-0 bg-transparent p-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover.url}
            alt={cover.alt}
            className="block max-h-[480px] size-full object-cover"
          />
        </button>

        {/* Thumbnail column */}
        {thumbs.length > 0 && (
          <div className="flex flex-col gap-2">
            {thumbs.map((p, i) => {
              const isLast = i === thumbs.length - 1;
              const showOverlay = isLast && hasMore;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => openAt(i + 1)}
                  className="relative flex-1 cursor-pointer overflow-hidden border-0 bg-transparent p-0"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={p.alt}
                    className="block size-full object-cover"
                  />
                  {showOverlay && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-[15px] font-semibold text-white">
                      +{photos.length - 3} more
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <dialog ref={dialogRef} className="photo-lightbox">
        <div className="photo-lightbox-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[current].url}
            alt={photos[current].alt}
            className="photo-lightbox-img"
          />

          {photos.length > 1 && (
            <>
              <button type="button" className="photo-lightbox-nav prev" onClick={prev} aria-label="Previous photo">‹</button>
              <button type="button" className="photo-lightbox-nav next" onClick={next} aria-label="Next photo">›</button>
              <span className="photo-lightbox-counter">{current + 1} / {photos.length}</span>
            </>
          )}

          <button type="button" className="photo-lightbox-close" onClick={close} aria-label="Close">✕</button>
        </div>
      </dialog>
    </>
  );
}
