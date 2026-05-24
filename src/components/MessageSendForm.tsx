"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { MessageTemplate } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const errorCls = "rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive";

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
    <div className="mt-4">
      {error && <p className={errorCls}>{error}</p>}
      <label htmlFor="message-body" className="sr-only">Message</label>
      <Textarea
        id="message-body"
        className="min-h-20"
        placeholder="Write a message…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button
          disabled={loading || !body.trim()}
          onClick={send}
        >
          {loading ? "Sending…" : "Send message"}
        </Button>
        {showTemplates && (
          <div className="relative">
            <Button type="button" variant="outline" onClick={openPicker}>
              Templates
            </Button>
            {pickerOpen && (
              <div className="absolute bottom-[calc(100%+8px)] left-0 z-10 max-h-80 min-w-[260px] max-w-[360px] overflow-auto rounded-lg border border-border bg-popover p-2 shadow-lg">
                {templatesLoading && <p className="m-2 text-[13px] text-muted-foreground">Loading…</p>}
                {!templatesLoading && templates !== null && templates.length === 0 && (
                  <div className="p-2">
                    <p className="mb-1.5 text-[13px] text-foreground">No templates yet.</p>
                    <Link href="/dashboard/templates" className="text-[13px] text-clay hover:text-clay-deep">
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
                        className="block w-full rounded px-2 py-1.5 text-left transition-colors hover:bg-muted"
                      >
                        <p className="text-[13px] font-semibold text-foreground">{t.title}</p>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {t.body}
                        </p>
                      </button>
                    ))}
                    <div className="mt-1.5 border-t border-border pt-1.5">
                      <Link href="/dashboard/templates" className="px-2 text-[13px] text-clay hover:text-clay-deep">
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
