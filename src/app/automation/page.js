"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "../../components/ui/PageHeader";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import { formatDate } from "../../lib/format";

function statusTone(status) {
  if (status === "succeeded") return "good";
  if (status === "failed" || status === "blocked") return "bad";
  if (status === "queued") return "warn";
  return "neutral";
}

export default function AutomationActivityPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/automation");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        setRows(data.rows || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      <PageHeader
        title="Automation Activity"
        description="Simulated internal actions only — CRM tasks, coaching items, and outbound drafts that are never sent."
      />

      <section className="panel">
        {loading ? (
          <div className="panel-pad muted">Loading activity…</div>
        ) : error ? (
          <div className="panel-pad" style={{ color: "var(--danger)" }}>
            {error}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No automation activity yet"
            description="Analyze a call to create dummy CRM, coaching, or draft actions."
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Action</th>
                  <th>Call</th>
                  <th>Status</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDate(row.createdAt)}</td>
                    <td>{row.label}</td>
                    <td>
                      <Link href={`/calls/${row.callId}`}>{row.callId.slice(0, 10)}…</Link>
                    </td>
                    <td>
                      <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                    </td>
                    <td>{row.reason || "—"}</td>
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
