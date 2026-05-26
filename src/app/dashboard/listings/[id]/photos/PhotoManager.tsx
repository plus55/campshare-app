"use client";

import { useRef, useState } from "react";
import { photoUrl } from "@/lib/photos";
import type { VanPhoto } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  listingId: string;
  initialPhotos: VanPhoto[];
}

const LONG_PRESS_MS = 300;

export default function PhotoManager({ listingId, initialPhotos }: Props) {
  const [photos, setPhotos] = useState<VanPhoto[]>(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(files: FileList) {
    if (photos.length + files.length > 10) {
      setError("Maximum 10 photos per listing.");
      return;
    }
    setUploading(true);
    setError(null);

    for (const file of Array.from(files)) {
      try {
        const signRes = await fetch("/api/photos/sign", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ vanListingId: listingId, contentType: file.type, sizeBytes: file.size }),
        });
        if (!signRes.ok) {
          const j = await signRes.json().catch(() => ({})) as { error?: string };
          throw new Error(j.error ?? "Couldn't get upload URL.");
        }
        const { signedUrl, r2Key } = await signRes.json() as { signedUrl: string; r2Key: string };

        const putRes = await fetch(signedUrl, { method: "PUT", headers: { "content-type": file.type }, body: file });
        if (!putRes.ok) throw new Error("Upload to storage failed.");

        const metaRes = await fetch("/api/photos", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ vanListingId: listingId, r2Key, position: photos.length }),
        });
        if (!metaRes.ok) {
          const j = await metaRes.json().catch(() => ({})) as { error?: string };
          throw new Error(j.error ?? "Couldn't save photo.");
        }
        const newPhoto = await metaRes.json() as VanPhoto;
        setPhotos((prev) => [...prev, newPhoto]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed.");
        break;
      }
    }

    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function deletePhoto(photoId: string) {
    setError(null);
    try {
      const res = await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
      if (res.ok) setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      else setError("Couldn't delete photo.");
    } catch {
      setError("Network error. Photo was not deleted.");
    }
  }

  async function updateCaption(photoId: string, caption: string) {
    setError(null);
    try {
      const res = await fetch(`/api/photos/${photoId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ caption }),
      });
      if (!res.ok) {
        setError("Couldn't save caption.");
        return;
      }
      setPhotos((prev) => prev.map((p) => p.id === photoId ? { ...p, caption } : p));
    } catch {
      setError("Network error. Caption was not saved.");
    }
  }

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [touchDragIdx, setTouchDragIdx] = useState<number | null>(null);
  const [touchOverIdx, setTouchOverIdx] = useState<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const previousPhotosRef = useRef<VanPhoto[] | null>(null);

  async function movePhoto(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return;
    previousPhotosRef.current = photos;
    const reordered = [...photos];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const withPositions = reordered.map((p, i) => ({ ...p, position: i }));
    setPhotos(withPositions);

    try {
      const res = await fetch("/api/photos/reorder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ vanListingId: listingId, orderedIds: withPositions.map((p) => p.id) }),
      });
      if (!res.ok) throw new Error("Reorder failed");
    } catch {
      if (previousPhotosRef.current) setPhotos(previousPhotosRef.current);
      setError("Couldn't save new order.");
    }
  }

  function cancelLongPress() {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>, idx: number) {
    if (e.pointerType !== "touch") return;
    const target = e.currentTarget;
    const pointerId = e.pointerId;
    cancelLongPress();
    longPressTimerRef.current = window.setTimeout(() => {
      target.setPointerCapture(pointerId);
      setTouchDragIdx(idx);
      setTouchOverIdx(idx);
    }, LONG_PRESS_MS);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "touch") return;
    if (touchDragIdx === null) { cancelLongPress(); return; }
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const tile = el?.closest("[data-photo-idx]") as HTMLElement | null;
    if (tile) {
      const idx = Number(tile.dataset.photoIdx);
      if (!Number.isNaN(idx)) setTouchOverIdx(idx);
    }
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "touch") return;
    cancelLongPress();
    if (touchDragIdx !== null && touchOverIdx !== null) void movePhoto(touchDragIdx, touchOverIdx);
    setTouchDragIdx(null);
    setTouchOverIdx(null);
  }

  function onPointerCancel() {
    cancelLongPress();
    setTouchDragIdx(null);
    setTouchOverIdx(null);
  }

  return (
    <>
      {error && <div className="mb-3 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive" role="alert" aria-live="polite">{error}</div>}

      <div className="mb-4 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
        {photos.map((photo, idx) => {
          const url = photoUrl(photo.r2Key);
          const isTouchDragging = touchDragIdx === idx;
          const isTouchOver = touchDragIdx !== null && touchOverIdx === idx && touchDragIdx !== idx;
          return (
            <div
              key={photo.id}
              data-photo-idx={idx}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragIdx !== null) void movePhoto(dragIdx, idx); setDragIdx(null); }}
              onPointerDown={(e) => onPointerDown(e, idx)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              className="overflow-hidden rounded-lg border transition-[transform,border-color]"
              style={{
                borderColor: isTouchOver ? "var(--clay)" : undefined,
                borderWidth: isTouchOver ? 2 : 1,
                cursor: "grab",
                opacity: dragIdx === idx || isTouchDragging ? 0.5 : 1,
                transform: isTouchDragging ? "scale(1.03)" : "none",
                transitionDuration: "120ms",
                touchAction: touchDragIdx !== null ? "none" : "auto",
              }}
            >
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={photo.caption ?? ""} className="aspect-[4/3] w-full object-cover" />
              ) : (
                <div className="flex aspect-[4/3] w-full items-center justify-center bg-muted">
                  <span className="text-[12px] text-muted-foreground">photo</span>
                </div>
              )}
              <div className="p-2">
                {idx === 0 && <p className="mb-1 text-[11px] text-muted-foreground">Cover</p>}
                <Input
                  aria-label={`Caption for photo ${idx + 1}`}
                  className="h-7 text-[12px]"
                  placeholder="Caption…"
                  defaultValue={photo.caption ?? ""}
                  onBlur={(e) => void updateCaption(photo.id, e.target.value)}
                />
                <div className="mt-1.5 flex gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[12px]"
                    disabled={idx === 0}
                    onClick={() => void movePhoto(idx, idx - 1)}
                    aria-label={`Move photo ${idx + 1} earlier`}
                  >
                    Earlier
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[12px]"
                    disabled={idx === photos.length - 1}
                    onClick={() => void movePhoto(idx, idx + 1)}
                    aria-label={`Move photo ${idx + 1} later`}
                  >
                    Later
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="mt-1.5 h-7 text-[12px]"
                  onClick={() => void deletePhoto(photo.id)}
                >
                  Remove
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {photos.length < 10 && (
        <label className="inline-block cursor-pointer">
          <span className={buttonVariants({ variant: "outline" })}>
            <span>{uploading ? "Uploading…" : "+ Add photos"}</span>
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => { if (e.target.files?.length) void upload(e.target.files); }}
          />
        </label>
      )}
    </>
  );
}
