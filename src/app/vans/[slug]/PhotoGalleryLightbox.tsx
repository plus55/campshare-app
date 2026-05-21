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
      <div style={{ display: "grid", gridTemplateColumns: gridColumns, gap: 8, borderRadius: 12, overflow: "hidden", maxHeight: 480 }}>
        {/* Cover */}
        <button
          type="button"
          onClick={() => openAt(0)}
          style={{ padding: 0, border: "none", cursor: "pointer", background: "transparent", display: "block", height: "100%" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover.url}
            alt={cover.alt}
            style={{ width: "100%", height: "100%", maxHeight: 480, objectFit: "cover", display: "block" }}
          />
        </button>

        {/* Thumbnail column */}
        {thumbs.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {thumbs.map((p, i) => {
              const isLast = i === thumbs.length - 1;
              const showOverlay = isLast && hasMore;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => openAt(i + 1)}
                  style={{ padding: 0, border: "none", cursor: "pointer", background: "transparent", flex: 1, position: "relative", overflow: "hidden" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={p.alt}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                  {showOverlay && (
                    <div style={{
                      position: "absolute", inset: 0,
                      background: "rgba(0,0,0,0.48)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontWeight: 600, fontSize: 15,
                    }}>
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
