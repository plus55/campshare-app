"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { MessageTemplate } from "@/lib/types";

interface Props {
  bookingId: string;
  /** When true, render the "Templates" picker (host side only). */
  showTemplates?: boolean;
}

export function MessageSendForm({ bookingId, showTemplates = false }: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Templates picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [templates, setTemplates] = useState<MessageTemplate[] | null>(null);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  async function openPicker() {
    if (pickerOpen) { setPickerOpen(false); return; }
    setPickerOpen(true);
    if (templates !== null) return;
    setTemplatesLoading(true);
    try {
      const res = await fetch("/api/templates");
      if (res.ok) {
        const data = await res.json() as { templates: MessageTemplate[] };
        setTemplates(data.templates);
      } else {
        setTemplates([]);
      }
    } catch {
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  }

  function applyTemplate(t: MessageTemplate) {
    setBody((prev) => (prev.trim() ? prev + "\n\n" + t.body : t.body));
    setPickerOpen(false);
  }

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
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
        <button
          className="cs-btn cs-btn-primary"
          disabled={loading || !body.trim()}
          onClick={send}
        >
          {loading ? "Sending…" : "Send message"}
        </button>
        {showTemplates && (
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="cs-btn cs-btn-ghost"
              onClick={openPicker}
            >
              Templates
            </button>
            {pickerOpen && (
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 8px)",
                  left: 0,
                  background: "var(--paper, #fff)",
                  border: "1px solid var(--sand-200, #e5e1d8)",
                  borderRadius: 8,
                  padding: 8,
                  minWidth: 260,
                  maxWidth: 360,
                  maxHeight: 320,
                  overflow: "auto",
                  boxShadow: "0 6px 24px rgba(0,0,0,0.08)",
                  zIndex: 10,
                }}
              >
                {templatesLoading && <p className="cs-muted cs-small" style={{ margin: 8 }}>Loading…</p>}
                {!templatesLoading && templates !== null && templates.length === 0 && (
                  <div style={{ padding: 8 }}>
                    <p className="cs-small" style={{ margin: "0 0 6px" }}>No templates yet.</p>
                    <Link href="/dashboard/templates" className="cs-small">
                      Create one →
                    </Link>
                  </div>
                )}
                {!templatesLoading && templates && templates.length > 0 && (
                  <>
                    {templates.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => applyTemplate(t)}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          padding: "6px 8px",
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          borderRadius: 4,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--sand-100, #f5f2ec)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{t.title}</p>
                        <p className="cs-muted" style={{ margin: "2px 0 0", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {t.body}
                        </p>
                      </button>
                    ))}
                    <div style={{ borderTop: "1px solid var(--sand-200, #e5e1d8)", marginTop: 6, paddingTop: 6 }}>
                      <Link href="/dashboard/templates" className="cs-small" style={{ padding: "0 8px" }}>
                        Manage templates →
                      </Link>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
