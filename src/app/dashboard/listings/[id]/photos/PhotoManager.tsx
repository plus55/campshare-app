"use client";

import { useRef, useState } from "react";
import { photoUrl } from "@/lib/photos";
import type { VanPhoto } from "@/lib/types";

interface Props {
  listingId: string;
  initialPhotos: VanPhoto[];
}

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
        // 1. Get a signed PUT URL from the Worker
        const signRes = await fetch("/api/photos/sign", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            vanListingId: listingId,
            contentType: file.type,
            sizeBytes: file.size,
          }),
        });
        if (!signRes.ok) {
          const j = await signRes.json().catch(() => ({})) as { error?: string };
          throw new Error(j.error ?? "Couldn't get upload URL.");
        }
        const { signedUrl, r2Key } = await signRes.json() as { signedUrl: string; r2Key: string };

        // 2. PUT directly to R2
        const putRes = await fetch(signedUrl, {
          method: "PUT",
          headers: { "content-type": file.type },
          body: file,
        });
        if (!putRes.ok) throw new Error("Upload to storage failed.");

        // 3. Persist the photo metadata
        const metaRes = await fetch("/api/photos", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            vanListingId: listingId,
            r2Key,
            position: photos.length,
          }),
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
    const res = await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
    if (res.ok) setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    else setError("Couldn't delete photo.");
  }

  async function updateCaption(photoId: string, caption: string) {
    await fetch(`/api/photos/${photoId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ caption }),
    });
    setPhotos((prev) => prev.map((p) => p.id === photoId ? { ...p, caption } : p));
  }

  // Drag-to-reorder
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  async function movePhoto(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return;
    const reordered = [...photos];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const withPositions = reordered.map((p, i) => ({ ...p, position: i }));
    setPhotos(withPositions);

    // Persist new positions
    await Promise.all(
      withPositions.map((p) =>
        fetch(`/api/photos/${p.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ position: p.position }),
        })
      )
    );
  }

  return (
    <>
      {error && <div className="cs-error">{error}</div>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {photos.map((photo, idx) => {
          const url = photoUrl(photo.r2Key);
          return (
            <div
              key={photo.id}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIdx !== null) void movePhoto(dragIdx, idx);
                setDragIdx(null);
              }}
              style={{
                border: "1px solid var(--sand-200)",
                borderRadius: 8,
                overflow: "hidden",
                cursor: "grab",
                opacity: dragIdx === idx ? 0.5 : 1,
              }}
            >
              {url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={photo.caption ?? ""} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover" }} />
              )}
              {!url && (
                <div style={{ width: "100%", aspectRatio: "4/3", background: "var(--sand-100)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="cs-muted cs-small">photo</span>
                </div>
              )}
              <div style={{ padding: 8 }}>
                {idx === 0 && <p className="cs-small cs-muted" style={{ margin: "0 0 4px" }}>Cover</p>}
                <input
                  className="cs-input"
                  style={{ fontSize: 12, padding: "4px 6px" }}
                  placeholder="Caption…"
                  defaultValue={photo.caption ?? ""}
                  onBlur={(e) => void updateCaption(photo.id, e.target.value)}
                />
                <button
                  type="button"
                  className="cs-btn cs-btn-danger"
                  style={{ marginTop: 6, fontSize: 12, padding: "4px 8px" }}
                  onClick={() => void deletePhoto(photo.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {photos.length < 10 && (
        <label style={{ display: "inline-block", cursor: "pointer" }}>
          <span className="cs-btn cs-btn-ghost">
            {uploading ? "Uploading…" : "+ Add photos"}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            style={{ display: "none" }}
            disabled={uploading}
            onChange={(e) => {
              if (e.target.files?.length) void upload(e.target.files);
            }}
          />
        </label>
      )}
    </>
  );
}
