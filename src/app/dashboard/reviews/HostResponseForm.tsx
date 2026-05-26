"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Respond publicly
      </Button>
    );
  }

  return (
    <div className="mt-2.5">
      <label htmlFor={`host-response-${reviewId}`} className="sr-only">Public response</label>
      <Textarea
        id={`host-response-${reviewId}`}
        className="min-h-[80px]"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write your public response… (min. 10 characters)"
        maxLength={1000}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={submit} disabled={loading}>
          {loading ? "Posting…" : "Post response"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => { setOpen(false); setText(""); setError(null); }}
          disabled={loading}
        >
          Cancel
        </Button>
        {error && <span role="alert" aria-live="polite" className="text-[13px] text-destructive">{error}</span>}
        <span className="ml-auto text-[12px] text-muted-foreground">{text.length}/1000</span>
      </div>
    </div>
  );
}
