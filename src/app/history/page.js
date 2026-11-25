"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import { CALL_TYPES } from "../../lib/mock-data";
import { callTypeLabel, formatDate, scoreTone } from "../../lib/format";

function riskTone(risk) {
  if (risk === "high") return "bad";
  if (risk === "medium") return "warn";
  return "good";
}

export default function HistoryPage() {
  const [query, setQuery] = useState("");
  const [callType, setCallType] = useState("all");
  const [risk, setRisk] = useState("all");
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          q: query,
          callType,
          risk,
          status,
          source,
        });
        const res = await fetch(`/api/calls?${params.toString()}`, { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load history");
        setCalls(data.calls || []);
      } catch (err) {
        if (err.name !== "AbortError") setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    const timer = setTimeout(load, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, callType, risk, status, source]);

  return (
    <div>
      <PageHeader
        title="Call History"
        description="Your analyzed calls. Admins see everyone’s history; normal users see only their own."
      />

      <div className="filters panel panel-pad">
        <div className="field" style={{ minWidth: 220, flex: 1 }}>
          <label htmlFor="search">Search</label>
          <div style={{ position: "relative" }}>
            <Search
              size={16}
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}
            />
            <input
              id="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Title or representative"
              style={{ paddingLeft: 36, width: "100%" }}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="type">Type</label>
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
          <label htmlFor="risk">Risk</label>
          <select id="risk" value={risk} onChange={(e) => setRisk(e.target.value)}>
            <option value="all">All</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All</option>
            <option value="completed">Completed</option>
            <option value="exception">Exception</option>
            <option value="processing">Processing</option>
            <option value="quarantined">Quarantined</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="source">Source</label>
          <select id="source" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="all">All</option>
            <option value="manual">Manual</option>
            <option value="webhook">Webhook</option>
          </select>
        </div>
      </div>

      <section className="panel">
        {loading ? (
          <div className="panel-pad muted">Loading calls…</div>
        ) : error ? (
          <div className="panel-pad" style={{ color: "var(--danger)" }}>
            {error}
          </div>
        ) : calls.length === 0 ? (
          <EmptyState
            title="No calls match these filters"
            description="Try clearing filters or analyze a new synthetic transcript."
            action={
              <Link href="/analyze" className="btn btn-primary">
                Analyze Call
              </Link>
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Call</th>
                  <th>Rep</th>
                  <th>Type</th>
                  <th>Score</th>
                  <th>Risk</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((call) => (
                  <tr key={call.id}>
                    <td>
                      <Link href={`/calls/${call.id}`}>{call.title}</Link>
                    </td>
                    <td>{call.representativeName || "—"}</td>
                    <td>{callTypeLabel(call.callType)}</td>
                    <td>
                      <Badge tone={scoreTone(call.overallScore)}>
                        {call.overallScore == null ? "—" : call.overallScore}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={riskTone(call.riskLevel)}>{call.riskLevel}</Badge>
                    </td>
                    <td>{call.status}</td>
                    <td>{call.source}</td>
                    <td>{formatDate(call.occurredAt)}</td>
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
