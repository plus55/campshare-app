"use client";

import { useState } from "react";
import {
  MAX_TEMPLATES_PER_HOST,
  TEMPLATE_BODY_MAX,
  TEMPLATE_TITLE_MAX,
} from "@/lib/constants";
import type { MessageTemplate } from "@/lib/types";

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
    if (!t || !b) {
      setError("Title and body are required.");
      return;
    }
    if (t.length > TEMPLATE_TITLE_MAX) {
      setError(`Title must be ${TEMPLATE_TITLE_MAX} characters or fewer.`);
      return;
    }
    if (b.length > TEMPLATE_BODY_MAX) {
      setError(`Body must be ${TEMPLATE_BODY_MAX} characters or fewer.`);
      return;
    }

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
    <div style={{ marginTop: 16 }}>
      {error && <p className="cs-error">{error}</p>}

      {!showForm && (
        <button
          type="button"
          className="cs-btn cs-btn-primary"
          onClick={startNew}
          disabled={atLimit}
        >
          + New template
        </button>
      )}
      {atLimit && !showForm && (
        <p className="cs-muted cs-small" style={{ marginTop: 8 }}>
          You&rsquo;ve reached the {MAX_TEMPLATES_PER_HOST}-template limit. Delete one to add another.
        </p>
      )}

      {showForm && (
        <div className="cs-card" style={{ marginTop: 8 }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>
            {editingId ? "Edit template" : "New template"}
          </h2>
          <label className="cs-small" style={{ display: "block", marginBottom: 12 }}>
            Title
            <input
              className="cs-input"
              type="text"
              value={title}
              maxLength={TEMPLATE_TITLE_MAX}
              placeholder="e.g. Pickup directions"
              onChange={(e) => setTitle(e.target.value)}
              style={{ marginTop: 4 }}
            />
            <span className="cs-muted" style={{ fontSize: 11 }}>
              {title.length}/{TEMPLATE_TITLE_MAX}
            </span>
          </label>
          <label className="cs-small" style={{ display: "block", marginBottom: 12 }}>
            Body
            <textarea
              className="cs-textarea"
              value={body}
              maxLength={TEMPLATE_BODY_MAX}
              placeholder="The full message that gets pasted into the chat…"
              onChange={(e) => setBody(e.target.value)}
              style={{ marginTop: 4, minHeight: 140 }}
            />
            <span className="cs-muted" style={{ fontSize: 11 }}>
              {body.length}/{TEMPLATE_BODY_MAX}
            </span>
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="cs-btn cs-btn-primary"
              onClick={save}
              disabled={busy}
            >
              {busy ? "Saving…" : "Save template"}
            </button>
            <button
              type="button"
              className="cs-btn cs-btn-ghost"
              onClick={cancel}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {templates.length === 0 && !showForm && (
          <p className="cs-muted cs-small">No templates yet.</p>
        )}
        {templates.map((t) => (
          <div key={t.id} className="cs-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 600 }}>{t.title}</p>
                <p className="cs-small" style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>
                  {t.body}
                </p>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button
                  type="button"
                  className="cs-btn cs-btn-ghost"
                  style={{ fontSize: 13, padding: "6px 12px" }}
                  onClick={() => startEdit(t)}
                  disabled={busy}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="cs-btn cs-btn-ghost"
                  style={{ fontSize: 13, padding: "6px 12px" }}
                  onClick={() => remove(t.id)}
                  disabled={busy}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
