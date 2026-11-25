"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "../../../components/ui/PageHeader";
import Badge from "../../../components/ui/Badge";
import EmptyState from "../../../components/ui/EmptyState";
import { CALL_TYPES } from "../../../lib/mock-data";
import { callTypeLabel, formatDate, scoreTone } from "../../../lib/format";

export default function PracticeHistoryPage() {
  const [sessions, setSessions] = useState([]);
  const [callType, setCallType] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ callType, difficulty, status, q });
        const res = await fetch(`/api/practice/sessions?${params}`, { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        setSessions(data.sessions || []);
      } catch (err) {
        if (err.name !== "AbortError") setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    const t = setTimeout(load, 150);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [callType, difficulty, status, q]);

  return (
    <div>
      <PageHeader
        title="Practice History"
        description="Practice sessions only — these never appear in operational Call History or affect live analytics."
        actions={
          <Link href="/practice/new" className="btn btn-primary">
            Start New Practice
          </Link>
        }
      />

      <div className="filters panel panel-pad">
        <div className="field" style={{ flex: 1, minWidth: 180 }}>
          <label htmlFor="q">Search</label>
          <input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Scenario or representative" />
        </div>
        <div className="field">
          <label htmlFor="type">Category</label>
          <select id="type" value={callType} onChange={(e) => setCallType(e.target.value)}>
            <option value="all">All</option>
            {CALL_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="diff">Difficulty</label>
          <select id="diff" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="all">All</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All</option>
            <option value="in_progress">In progress</option>
            <option value="evaluation_pending">Evaluation pending</option>
            <option value="evaluated">Evaluated</option>
            <option value="evaluation_failed">Evaluation failed</option>
            <option value="abandoned">Abandoned</option>
          </select>
        </div>
      </div>

      <section className="panel">
        {loading ? (
          <div className="panel-pad muted">Loading…</div>
        ) : error ? (
          <div className="panel-pad" style={{ color: "var(--danger)" }}>
            {error}
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            title="No practice sessions yet"
            description="Start a practice conversation to build history."
            action={
              <Link href="/practice/new" className="btn btn-primary">
                Start New Practice
              </Link>
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Rep</th>
                  <th>Category</th>
                  <th>Scenario</th>
                  <th>Difficulty</th>
                  <th>Duration</th>
                  <th>Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link href={s.status === "in_progress" ? `/practice/session/${s.id}` : `/practice/session/${s.id}/results`}>
                        {formatDate(s.createdAt)}
                      </Link>
                    </td>
                    <td>{s.representativeName || "—"}</td>
                    <td>{callTypeLabel(s.callType)}</td>
                    <td>{s.scenarioName}</td>
                    <td>{s.difficulty}</td>
                    <td>{s.durationSec != null ? `${Math.floor(s.durationSec / 60)}m ${s.durationSec % 60}s` : "—"}</td>
                    <td>
                      <Badge tone={scoreTone(s.overallScore)}>
                        {s.overallScore == null ? "—" : s.overallScore}
                      </Badge>
                    </td>
                    <td>{s.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
