"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "../../../components/ui/PageHeader";
import StatCard from "../../../components/ui/StatCard";
import EmptyState from "../../../components/ui/EmptyState";
import ScoreTrendChart from "../../../components/charts/ScoreTrendChart";
import CallTypeChart from "../../../components/charts/CallTypeChart";
import { callTypeLabel, formatPercent } from "../../../lib/format";
import { Clock3, GraduationCap, Target, Trophy } from "lucide-react";

function formatDuration(sec) {
  if (!sec) return "0m";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function PracticePerformancePage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/practice/analytics");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load");
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="panel panel-pad muted">Loading practice analytics…</div>;
  if (error) {
    return (
      <div className="panel panel-pad" style={{ color: "var(--danger)" }}>
        {error}
      </div>
    );
  }

  const { stats, trend, byCallType, byDifficulty, commonCoaching } = data;
  const typeChart = (byCallType || []).map((row) => ({
    type: callTypeLabel(row.type),
    score: row.score,
  }));
  const trendChart = (trend || []).map((row) => ({ day: row.point, score: row.score }));

  return (
    <div>
      <PageHeader
        title="Practice Performance"
        description="Metrics calculated only from practice sessions. Not comparable blindly across unrelated scenarios without context."
        actions={
          <Link href="/practice/new" className="btn btn-primary">
            Start New Practice
          </Link>
        }
      />

      {stats.totalSessions === 0 ? (
        <section className="panel">
          <EmptyState
            title="No practice data yet"
            description="Complete a practice session with evaluation to populate these charts."
            action={
              <Link href="/practice/new" className="btn btn-primary">
                Start New Practice
              </Link>
            }
          />
        </section>
      ) : (
        <>
          <div className="grid-stats">
            <StatCard label="Total sessions" value={stats.totalSessions} icon={GraduationCap} />
            <StatCard label="Completed / evaluated" value={`${stats.completedSessions} / ${stats.evaluatedSessions}`} icon={Target} />
            <StatCard
              label="Average practice score"
              value={stats.averageScore == null ? "—" : stats.averageScore}
              icon={Trophy}
            />
            <StatCard label="Best score" value={stats.bestScore == null ? "—" : stats.bestScore} icon={Trophy} />
            <StatCard label="Total practice time" value={formatDuration(stats.totalPracticeTimeSec)} icon={Clock3} />
            <StatCard
              label="Eval coverage"
              value={
                stats.totalSessions
                  ? formatPercent((stats.evaluatedSessions / stats.totalSessions) * 100)
                  : "—"
              }
              icon={Target}
            />
          </div>

          <div className="grid-2">
            <section className="panel panel-pad">
              <h2 className="panel-title">Score trend</h2>
              <p className="panel-sub">Recent evaluated sessions (ordered)</p>
              {trendChart.length ? <ScoreTrendChart data={trendChart} /> : <p className="muted">No evaluated scores yet.</p>}
            </section>
            <section className="panel panel-pad">
              <h2 className="panel-title">By call category</h2>
              <p className="panel-sub">Compare within the same category when possible</p>
              {typeChart.length ? <CallTypeChart data={typeChart} /> : <p className="muted">No category data yet.</p>}
            </section>
          </div>

          <div className="grid-2">
            <section className="panel panel-pad">
              <h2 className="panel-title">By difficulty</h2>
              <ul className="list-plain">
                {(byDifficulty || []).map((row) => (
                  <li key={row.difficulty}>
                    {row.difficulty}: {row.score} avg ({row.count} sessions)
                  </li>
                ))}
                {!(byDifficulty || []).length ? <li>No difficulty breakdown yet</li> : null}
              </ul>
            </section>
            <section className="panel panel-pad">
              <h2 className="panel-title">Common coaching opportunities</h2>
              <ul className="list-plain">
                {(commonCoaching || []).map((row) => (
                  <li key={row.text}>
                    {row.text} <span className="muted">×{row.count}</span>
                  </li>
                ))}
                {!(commonCoaching || []).length ? <li>No coaching themes yet</li> : null}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
