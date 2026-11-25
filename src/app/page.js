import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import {
  AlertOctagon,
  CheckCircle2,
  Clock3,
  ListTodo,
  PhoneCall,
  TrendingUp,
} from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import Badge from "../components/ui/Badge";
import ScoreTrendChart from "../components/charts/ScoreTrendChart";
import CallTypeChart from "../components/charts/CallTypeChart";
import EmptyState from "../components/ui/EmptyState";
import { requireUser } from "../lib/auth";
import { getOverviewStats } from "../lib/services/analyze-call";
import { getAiMode } from "../lib/ai/provider";
import { callTypeLabel, formatDate, formatMs, formatPercent, scoreTone } from "../lib/format";
import { redirect } from "next/navigation";

function riskTone(risk) {
  if (risk === "high") return "bad";
  if (risk === "medium") return "warn";
  return "good";
}

async function OverviewContent() {
  await connection();
  const auth = await requireUser();
  if (auth.response) redirect("/login");

  const isAdmin = Boolean(auth.appUser?.isAdmin);
  const data = await getOverviewStats({
    ownerUserId: isAdmin ? undefined : auth.appUser.id,
  });
  const aiMode = getAiMode();
  const { stats, scoreTrend, scoresByType, distribution, recentCalls } = data;
  const trendForChart = scoreTrend.map((row) => ({
    day: row.day,
    score: row.score,
  }));

  return (
    <div>
      <PageHeader
        title="Overview"
        description={
          isAdmin
            ? "Org-wide aggregates from all users’ call records."
            : "Your personal aggregates — only calls you analyzed."
        }
        actions={
          <Link href="/analyze" className="btn btn-primary">
            Analyze a call
          </Link>
        }
      />

      <div className="pill-note" style={{ marginBottom: 16 }}>
        AI mode: {aiMode === "demo" ? "Demo (synthetic, labeled)" : "Live xAI"}
        {" — "}
        Viewing as {isAdmin ? "Admin (all users)" : "User (your calls only)"}
      </div>

      <div className="grid-stats">
        <StatCard
          label="Total calls"
          value={stats.totalCalls}
          icon={PhoneCall}
          hint={isAdmin ? "All users" : "Your calls"}
        />
        <StatCard
          label="Average score"
          value={stats.averageScore.toFixed(1)}
          icon={TrendingUp}
          hint="Weighted totals"
        />
        <StatCard label="Flagged" value={stats.flaggedCount} icon={AlertOctagon} hint="Exception / high risk" />
        <StatCard label="Open tasks" value={stats.taskCount} icon={ListTodo} hint="Dummy CRM + coaching" />
        <StatCard
          label="Success rate"
          value={formatPercent(stats.successRate)}
          icon={CheckCircle2}
          hint="Non-failed calls"
        />
        <StatCard
          label="Avg processing"
          value={formatMs(stats.avgProcessingMs)}
          icon={Clock3}
          hint="Recorded latency"
        />
      </div>

      {stats.totalCalls === 0 ? (
        <section className="panel">
          <EmptyState
            title="No calls analyzed yet"
            description="Submit a transcript on Analyze Call. Scoring and coaching use live xAI."
            action={
              <Link href="/analyze" className="btn btn-primary">
                Analyze Call
              </Link>
            }
          />
        </section>
      ) : (
        <>
          <div className="grid-2">
            <section className="panel panel-pad">
              <h2 className="panel-title">Score trend</h2>
              <p className="panel-sub">Last 7 days from stored scores</p>
              <ScoreTrendChart data={trendForChart} />
            </section>
            <section className="panel panel-pad">
              <h2 className="panel-title">Scores by call type</h2>
              <p className="panel-sub">Comparable within type only</p>
              {scoresByType.length ? (
                <CallTypeChart data={scoresByType} />
              ) : (
                <p className="muted">No scored calls yet.</p>
              )}
            </section>
          </div>

          <div className="grid-2">
            <section className="panel panel-pad">
              <h2 className="panel-title">Score distribution</h2>
              <p className="panel-sub">Bucketed from stored call records</p>
              <div className="stack">
                {distribution.map((row) => (
                  <div key={row.bucket} className="score-bar">
                    <div className="score-bar-head">
                      <span className="score-bar-label">{row.bucket}</span>
                      <span className="score-bar-value">{row.count}</span>
                    </div>
                    <div className="score-bar-track">
                      <div
                        className="score-bar-fill tone-ok"
                        style={{
                          width: `${Math.min(
                            100,
                            row.count * (stats.totalCalls ? 100 / Math.max(stats.totalCalls, 1) : 0)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel panel-pad">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                <div>
                  <h2 className="panel-title">Recent calls</h2>
                  <p className="panel-sub">Latest analyzed transcripts</p>
                </div>
                <Link href="/history" className="btn btn-secondary">
                  View all
                </Link>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Call</th>
                      <th>Type</th>
                      <th>Score</th>
                      <th>Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCalls.map((call) => (
                      <tr key={call.id}>
                        <td>
                          <Link href={`/calls/${call.id}`}>{call.title}</Link>
                          <div className="muted" style={{ fontSize: "0.75rem", marginTop: 2 }}>
                            {formatDate(call.occurredAt)}
                          </div>
                        </td>
                        <td>{callTypeLabel(call.callType)}</td>
                        <td>
                          <Badge tone={scoreTone(call.overallScore)}>
                            {call.overallScore == null ? "—" : call.overallScore}
                          </Badge>
                        </td>
                        <td>
                          <Badge tone={riskTone(call.riskLevel)}>{call.riskLevel}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

export default function OverviewPage() {
  return (
    <Suspense fallback={<div className="panel panel-pad">Loading overview…</div>}>
      <OverviewContent />
    </Suspense>
  );
}
