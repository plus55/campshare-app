"use client";

import { useState } from "react";
import {
  MAX_TEMPLATES_PER_HOST,
  TEMPLATE_BODY_MAX,
  TEMPLATE_TITLE_MAX,
} from "@/lib/constants";
import type { MessageTemplate } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const fieldCls = "flex flex-col gap-1.5";
const labelCls = "text-sm font-medium text-foreground";
const errorCls = "rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive";

interface Props {
  initial: MessageTemplate[];
}

export function TemplateManager({ initial }: Props) {
  const [templates, setTemplates] = useState<MessageTemplate[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const atLimit = templates.length >= MAX_TEMPLATES_PER_HOST;

  function startNew() {
    setEditingId(null);
    setTitle("");
    setBody("");
    setError(null);
    setShowForm(true);
  }

  function startEdit(t: MessageTemplate) {
    setEditingId(t.id);
    setTitle(t.title);
    setBody(t.body);
    setError(null);
    setShowForm(true);
  }

  function cancel() {
    setShowForm(false);
    setEditingId(null);
    setTitle("");
    setBody("");
    setError(null);
  }

  async function save() {
    const t = title.trim();
    const b = body.trim();
    if (!t || !b) { setError("Title and body are required."); return; }
    if (t.length > TEMPLATE_TITLE_MAX) { setError(`Title must be ${TEMPLATE_TITLE_MAX} characters or fewer.`); return; }
    if (b.length > TEMPLATE_BODY_MAX) { setError(`Body must be ${TEMPLATE_BODY_MAX} characters or fewer.`); return; }

    setBusy(true);
    setError(null);
    try {
      if (editingId) {
        const res = await fetch(`/api/templates/${editingId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: t, body: b }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(d.error ?? "Couldn't save template.");
        }
        setTemplates((prev) =>
          prev.map((x) =>
            x.id === editingId ? { ...x, title: t, body: b, updatedAt: Math.floor(Date.now() / 1000) } : x
          )
        );
      } else {
        const res = await fetch("/api/templates", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: t, body: b }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(d.error ?? "Couldn't create template.");
        }
        const created = await res.json() as MessageTemplate;
        setTemplates((prev) => [...prev, created]);
      }
      cancel();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this template?")) return;
    setBusy(true);
    const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } else {
      setError("Couldn't delete template.");
    }
  }

  return (
    <div className="mt-4">
      {error && <p className={errorCls} role="alert" aria-live="polite">{error}</p>}

      {!showForm && (
        <Button type="button" onClick={startNew} disabled={atLimit}>
          + New template
        </Button>
      )}
      {atLimit && !showForm && (
        <p className="mt-2 text-[12px] text-muted-foreground">
          You&rsquo;ve reached the {MAX_TEMPLATES_PER_HOST}-template limit. Delete one to add another.
        </p>
      )}

      {showForm && (
        <div className="mt-3 rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 font-serif text-lg text-forest-deep dark:text-cream">
            {editingId ? "Edit template" : "New template"}
          </h2>
          <div className={fieldCls}>
            <label htmlFor="template-title" className={labelCls}>Title</label>
            <Input
              id="template-title"
              type="text"
              value={title}
              maxLength={TEMPLATE_TITLE_MAX}
              placeholder="e.g. Pickup directions"
              onChange={(e) => setTitle(e.target.value)}
            />
            <span className="text-[11px] text-muted-foreground">{title.length}/{TEMPLATE_TITLE_MAX}</span>
          </div>
          <div className={`${fieldCls} mt-3`}>
            <label htmlFor="template-body" className={labelCls}>Body</label>
            <Textarea
              id="template-body"
              className="min-h-[140px]"
              value={body}
              maxLength={TEMPLATE_BODY_MAX}
              placeholder="The full message that gets pasted into the chat…"
              onChange={(e) => setBody(e.target.value)}
            />
            <span className="text-[11px] text-muted-foreground">{body.length}/{TEMPLATE_BODY_MAX}</span>
          </div>
          <div className="mt-4 flex gap-2">
            <Button type="button" onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save template"}
            </Button>
            <Button type="button" variant="outline" onClick={cancel} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-3">
        {templates.length === 0 && !showForm && (
          <p className="text-[13px] text-muted-foreground">No templates yet.</p>
        )}
        {templates.map((t) => (
          <div key={t.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">{t.title}</p>
                <p className="mt-1.5 whitespace-pre-wrap text-[13px] text-muted-foreground">{t.body}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button type="button" variant="outline" size="sm" onClick={() => startEdit(t)} disabled={busy}>
                  Edit
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => remove(t.id)} disabled={busy}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
