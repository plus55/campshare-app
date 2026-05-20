"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MessageSendForm({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!body.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setError(d.error ?? "Could not send message");
      } else {
        setBody("");
        router.refresh();
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      {error && <p className="cs-error">{error}</p>}
      <textarea
        className="cs-textarea"
        placeholder="Write a message…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        style={{ minHeight: 80 }}
      />
      <button
        className="cs-btn cs-btn-primary"
        disabled={loading || !body.trim()}
        onClick={send}
        style={{ marginTop: 8 }}
      >
        {loading ? "Sending…" : "Send message"}
      </button>
    </div>
  );
}
