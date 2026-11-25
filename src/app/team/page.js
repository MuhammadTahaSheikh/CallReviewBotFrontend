"use client";

import { useEffect, useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PageHeader from "../../components/ui/PageHeader";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import { CALL_TYPES } from "../../lib/mock-data";
import { scoreTone } from "../../lib/format";
import Link from "next/link";

export default function TeamPerformancePage() {
  const [callType, setCallType] = useState("all");
  const [reps, setReps] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/team?callType=${encodeURIComponent(callType)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load team performance");
        setReps(data.reps || []);
        setTotals(data.totals || null);
      } catch (err) {
        if (err.name !== "AbortError") setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [callType]);

  return (
    <div>
      <PageHeader
        title="Team Performance"
        description="Per-representative trends from stored call scores. Filter by call type — comparisons are only meaningful within the same type."
      />

      <div className="filters panel panel-pad" style={{ marginBottom: 14 }}>
        <div className="field">
          <label htmlFor="team-type">Call type filter</label>
          <select id="team-type" value={callType} onChange={(e) => setCallType(e.target.value)}>
            <option value="all">All types (separate by-type averages below)</option>
            {CALL_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} only
              </option>
            ))}
          </select>
        </div>
        {totals ? (
          <div className="muted" style={{ alignSelf: "end", fontSize: "0.85rem" }}>
            {totals.representatives} reps · {totals.scoredCalls} scored calls
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="panel panel-pad muted">Loading team performance…</div>
      ) : error ? (
        <div className="panel panel-pad" style={{ color: "var(--danger)" }}>
          {error}
        </div>
      ) : reps.length === 0 ? (
        <section className="panel">
          <EmptyState
            title="No scored calls for this filter"
            description="Analyze calls with a representative name assigned to build team trends."
            action={
              <Link href="/analyze" className="btn btn-primary">
                Analyze Call
              </Link>
            }
          />
        </section>
      ) : (
        <div className="team-grid">
          {reps.map((rep) => {
            const chartData =
              rep.trend.length > 0
                ? rep.trend
                : [{ point: "—", score: null }];
            const yDomain = (() => {
              const scores = rep.trend.map((t) => t.score).filter((n) => n != null);
              if (!scores.length) return [0, 100];
              const min = Math.max(0, Math.min(...scores) - 10);
              const max = Math.min(100, Math.max(...scores) + 10);
              return [min, max];
            })();

            return (
              <section key={rep.id} className="panel panel-pad">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                  <div>
                    <h2 className="panel-title">{rep.name}</h2>
                    <p className="panel-sub" style={{ marginBottom: 0 }}>
                      {rep.calls} scored call{rep.calls === 1 ? "" : "s"}
                      {rep.avgScore != null ? (
                        <>
                          {" "}
                          · avg <Badge tone={scoreTone(rep.avgScore)}>{rep.avgScore.toFixed(1)}</Badge>
                        </>
                      ) : (
                        " · no scores yet"
                      )}
                      {rep.flagged > 0 ? (
                        <>
                          {" "}
                          · <Badge tone="warn">{rep.flagged} flagged</Badge>
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>

                {rep.calls === 0 ? (
                  <p className="muted" style={{ margin: "12px 0" }}>
                    No analyzed calls linked to this representative yet.
                  </p>
                ) : (
                  <div className="chart-wrap" style={{ minHeight: 140 }}>
                    <ResponsiveContainer width="100%" height={140}>
                      <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                        <XAxis dataKey="point" hide />
                        <YAxis
                          domain={yDomain}
                          tick={{ fill: "var(--muted)", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                          }}
                          formatter={(value) => [value, "Score"]}
                        />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="var(--accent)"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          connectNulls={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div style={{ marginTop: 10 }}>
                  <div className="muted" style={{ fontSize: "0.78rem", marginBottom: 8, fontWeight: 600 }}>
                    By comparable call type
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {Object.keys(rep.byType).length === 0 ? (
                      <span className="badge badge-neutral">No type breakdown yet</span>
                    ) : (
                      Object.entries(rep.byType).map(([type, info]) => (
                        <span key={type} className="badge badge-neutral">
                          {info.label}: {info.avgScore} ({info.count})
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
