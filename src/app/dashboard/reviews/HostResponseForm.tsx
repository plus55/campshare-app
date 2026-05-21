"use client";

import { useState } from "react";

export default function HostResponseForm({
  reviewId,
  onSuccess,
}: {
  reviewId: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (text.trim().length < 10) {
      setError("Response must be at least 10 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostResponse: text.trim() }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
      } else {
        onSuccess();
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="cs-btn cs-btn-outline cs-btn-sm" onClick={() => setOpen(true)}>
        Respond publicly
      </button>
    );
  }

  return (
    <div style={{ marginTop: 10 }}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write your public response… (min. 10 characters)"
        rows={3}
        maxLength={1000}
        style={{
          width: "100%", boxSizing: "border-box",
          padding: "10px 12px", borderRadius: 8,
          border: "1.5px solid var(--line)", background: "var(--cream)",
          fontFamily: "inherit", fontSize: 14, resize: "vertical",
          lineHeight: 1.5,
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          className="cs-btn cs-btn-primary cs-btn-sm"
          onClick={submit}
          disabled={loading}
        >
          {loading ? "Posting…" : "Post response"}
        </button>
        <button
          type="button"
          className="cs-btn cs-btn-outline cs-btn-sm"
          onClick={() => { setOpen(false); setText(""); setError(null); }}
          disabled={loading}
        >
          Cancel
        </button>
        {error && <span style={{ color: "var(--clay)", fontSize: 13 }}>{error}</span>}
        <span className="cs-muted cs-small" style={{ marginLeft: "auto" }}>{text.length}/1000</span>
      </div>
    </div>
  );
}
