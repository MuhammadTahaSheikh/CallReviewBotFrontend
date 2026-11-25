"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Pencil, Play, X } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import { formatDate } from "../../lib/format";

function riskTone(risk) {
  if (risk === "high") return "bad";
  if (risk === "medium") return "warn";
  return "ok";
}

function actionTone(status) {
  if (status === "completed") return "good";
  if (status === "rejected") return "bad";
  if (status === "blocked") return "warn";
  return "neutral";
}

export default function ExceptionQueuePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [draftNote, setDraftNote] = useState("");
  const [busyId, setBusyId] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/exceptions");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setItems(data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id, status, notes) {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch("/api/exceptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  }

  return (
    <div>
      <PageHeader
        title="Exception Queue"
        description="Policy-routed reviews: high-risk, optional medium-risk, QA samples, and quarantines. Approve releases blocked dummy actions; reject cancels them."
      />

      <section className="panel">
        {loading ? (
          <div className="panel-pad muted">Loading queue…</div>
        ) : error ? (
          <div className="panel-pad" style={{ color: "var(--danger)" }}>
            {error}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Queue is clear"
            description="No pending exceptions. Analyze a high-risk transcript (refund/legal), enable medium-risk queuing, or raise QA sample % in Settings."
          />
        ) : (
          items.map((item) => (
            <article key={item.id} className="exception-card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <h2 className="panel-title" style={{ marginBottom: 4 }}>
                    <Link href={`/calls/${item.callId}`}>{item.title}</Link>
                  </h2>
                  <p className="panel-sub" style={{ marginBottom: 0 }}>
                    {item.representativeName} · {formatDate(item.createdAt)}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <Badge tone={riskTone(item.risk)}>{item.risk} risk</Badge>
                  <Badge tone="info">{String(item.status).replaceAll("_", " ")}</Badge>
                </div>
              </div>

              <p style={{ margin: "12px 0 8px", fontWeight: 600 }}>Reason: {item.reason}</p>

              <div className="muted" style={{ fontSize: "0.85rem", marginBottom: 6 }}>
                Proposed actions
              </div>
              <ul className="list-plain">
                {(item.proposedActions || []).map((action, idx) => (
                  <li key={action.label || idx}>{action.label || action}</li>
                ))}
                {!(item.proposedActions || []).length ? <li>None recorded</li> : null}
              </ul>

              {(item.actionTasks || []).length ? (
                <div style={{ marginTop: 10 }}>
                  <div className="muted" style={{ fontSize: "0.85rem", marginBottom: 6 }}>
                    Action task status
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {item.actionTasks.map((task) => (
                      <Badge key={task.id} tone={actionTone(task.status)}>
                        {task.title}: {task.status}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {editingId === item.id ? (
                <div className="field" style={{ marginTop: 12 }}>
                  <label htmlFor={`note-${item.id}`}>Edit note / action guidance</label>
                  <textarea
                    id={`note-${item.id}`}
                    value={draftNote}
                    onChange={(e) => setDraftNote(e.target.value)}
                    style={{ minHeight: 90 }}
                    placeholder="Adjust guidance before approval…"
                  />
                  <div className="exception-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={busyId === item.id}
                      onClick={() => updateStatus(item.id, "approved", draftNote)}
                    >
                      <Check size={16} />
                      Save & approve
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="exception-actions">
                  {(item.allowedNext || []).includes("in_review") ? (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={busyId === item.id}
                      onClick={() => updateStatus(item.id, "in_review")}
                    >
                      <Play size={16} />
                      Start review
                    </button>
                  ) : null}
                  {(item.allowedNext || []).includes("approved") ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={busyId === item.id}
                      onClick={() => updateStatus(item.id, "approved")}
                    >
                      <Check size={16} />
                      Approve
                    </button>
                  ) : null}
                  {(item.allowedNext || []).includes("approved") ? (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={busyId === item.id}
                      onClick={() => {
                        setEditingId(item.id);
                        setDraftNote(
                          (item.proposedActions || []).map((a) => a.label || a).join("\n") || item.notes || ""
                        );
                      }}
                    >
                      <Pencil size={16} />
                      Edit
                    </button>
                  ) : null}
                  {(item.allowedNext || []).includes("rejected") ? (
                    <button
                      type="button"
                      className="btn btn-danger"
                      disabled={busyId === item.id}
                      onClick={() => updateStatus(item.id, "rejected")}
                    >
                      <X size={16} />
                      Reject
                    </button>
                  ) : null}
                  {(item.allowedNext || []).includes("resolved") ? (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={busyId === item.id}
                      onClick={() => updateStatus(item.id, "resolved")}
                    >
                      Resolve
                    </button>
                  ) : null}
                </div>
              )}
            </article>
          ))
        )}
      </section>
    </div>
  );
}
