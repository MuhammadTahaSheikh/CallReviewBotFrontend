"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PageHeader from "../../../../../components/ui/PageHeader";
import Badge from "../../../../../components/ui/Badge";
import ScoreBar from "../../../../../components/ui/ScoreBar";
import { callTypeLabel, scoreTone } from "../../../../../lib/format";

function formatDuration(sec) {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

export default function PracticeResultsPage() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [error, setError] = useState("");
  const [retrying, setRetrying] = useState(false);

  async function load() {
    const res = await fetch(`/api/practice/sessions/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load");
    setSession(data.session);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [id]);

  async function retryEvaluate() {
    setRetrying(true);
    setError("");
    try {
      const res = await fetch(`/api/practice/sessions/${id}/evaluate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Evaluation failed");
      setSession(data.session);
    } catch (err) {
      setError(err.message);
    } finally {
      setRetrying(false);
    }
  }

  if (!session && !error) return <div className="panel panel-pad muted">Loading results…</div>;
  if (!session) {
    return (
      <div className="panel panel-pad" style={{ color: "var(--danger)" }}>
        {error}
      </div>
    );
  }

  const evaluation = session.evaluation;
  const repCount = (session.messages || []).filter((m) => m.role === "representative").length;
  const harder =
    session.difficulty === "beginner"
      ? "intermediate"
      : session.difficulty === "intermediate"
        ? "advanced"
        : "advanced";

  return (
    <div>
      <PageHeader
        title="Practice Performance Report"
        description="Coaching is based on what you said as the trainee — not the simulated customer. Practice never triggers CRM, webhooks, or exception queues."
      />

      <div className="meta-row">
        <Badge tone="info">{callTypeLabel(session.callType)}</Badge>
        <Badge tone="neutral">{session.scenarioName}</Badge>
        <Badge tone="neutral">{session.difficulty}</Badge>
        <Badge tone="ok">{formatDuration(session.durationSec)}</Badge>
        <Badge tone="warn">{session.status}</Badge>
        {evaluation?.demoMode ? <Badge tone="warn">Demo evaluation</Badge> : <Badge tone="info">Live evaluation</Badge>}
      </div>

      {error ? (
        <div className="panel panel-pad" style={{ color: "var(--danger)", marginBottom: 14 }}>
          {error}
          <div style={{ marginTop: 10 }}>
            <button type="button" className="btn btn-secondary" disabled={retrying} onClick={retryEvaluate}>
              {retrying ? "Retrying…" : "Retry evaluation"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid-stats" style={{ marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-label">Overall score</div>
          <div className="stat-value">
            <Badge tone={scoreTone(evaluation?.overallScore)}>
              {evaluation?.overallScore == null ? "—" : evaluation.overallScore}
            </Badge>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Representative replies</div>
          <div className="stat-value">{repCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Evaluation mode</div>
          <div className="stat-value" style={{ fontSize: "1.1rem" }}>
            {evaluation?.evaluationMode || "—"}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Model</div>
          <div className="stat-value" style={{ fontSize: "1rem" }}>
            {evaluation?.model || "—"}
          </div>
        </div>
      </div>

      {evaluation ? (
        <>
          <div className="grid-2">
            <section className="panel panel-pad">
              <h2 className="panel-title">Category scores</h2>
              <p className="panel-sub">Reuses existing call-type scoring profile weights</p>
              {(evaluation.categoryScores || []).map((cat) => (
                <ScoreBar
                  key={cat.key}
                  label={cat.label}
                  score={cat.score}
                  weight={cat.weight}
                  evidence={cat.evidenceQuote}
                />
              ))}
            </section>
            <section className="panel panel-pad">
              <h2 className="panel-title">Scenario objective assessment</h2>
              <p className="panel-sub">{evaluation.objectiveAssessment?.objective}</p>
              {evaluation.objectiveAssessment?.scorePercent != null ? (
                <p>
                  Objective coverage: <strong>{evaluation.objectiveAssessment.scorePercent}%</strong>
                </p>
              ) : null}
              <ul className="list-plain">
                {(evaluation.objectiveAssessment?.results || []).map((r) => (
                  <li key={r.condition}>
                    {r.met ? "✓" : "○"} {r.condition}
                    <div className="muted" style={{ fontSize: "0.8rem" }}>
                      {r.evidence}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="grid-2">
            <section className="panel panel-pad">
              <h2 className="panel-title">What you did well</h2>
              <p className="panel-sub">Quotes are from your replies only</p>
              <ul className="list-plain">
                {(evaluation.strengths || []).map((item) => (
                  <li key={item.text || item}>
                    {item.text || item}
                    {item.evidence ? (
                      <div className="muted" style={{ fontSize: "0.82rem", fontStyle: "italic" }}>
                        “{item.evidence}”
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
            <section className="panel panel-pad">
              <h2 className="panel-title">What to improve in your wording</h2>
              <p className="panel-sub">Gaps are judged from your replies — customer lines are context only</p>
              <ul className="list-plain">
                {(evaluation.weaknesses || []).map((item) => (
                  <li key={item.text || item}>
                    {item.text || item}
                    {item.evidence ? (
                      <div className="muted" style={{ fontSize: "0.82rem", fontStyle: "italic" }}>
                        “{item.evidence}”
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="grid-2">
            <section className="panel panel-pad">
              <h2 className="panel-title">Areas for improvement</h2>
              <ul className="list-plain">
                {(evaluation.recommendations || []).map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
              <h3 style={{ marginTop: 16, fontSize: "0.95rem" }}>Missed opportunities</h3>
              <ul className="list-plain">
                {(evaluation.missedOpportunities || []).map((text) => (
                  <li key={text}>{text}</li>
                ))}
                {!(evaluation.missedOpportunities || []).length ? <li>None flagged</li> : null}
              </ul>
            </section>
            <section className="panel panel-pad">
              <h2 className="panel-title">Better versions of your replies</h2>
              <p className="panel-sub">Rewrites of what you said — practice saying the improved line</p>
              {(evaluation.suggestedResponses || []).map((item, idx) => (
                <div key={idx} style={{ marginBottom: 14 }}>
                  {item.original ? (
                    <>
                      <div className="muted" style={{ fontSize: "0.78rem", fontWeight: 600 }}>
                        What you said
                      </div>
                      <p style={{ margin: "4px 0 8px" }}>“{item.original}”</p>
                    </>
                  ) : null}
                  <div className="muted" style={{ fontSize: "0.78rem", fontWeight: 600 }}>
                    Stronger version for you to practice
                  </div>
                  <p style={{ margin: "4px 0 8px" }}>“{item.suggested}”</p>
                  <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                    Why: {item.why}
                  </p>
                </div>
              ))}
            </section>
          </div>

          {(evaluation.trainingWarnings || []).length ? (
            <section className="panel panel-pad" style={{ marginBottom: 14 }}>
              <h2 className="panel-title">Training warnings</h2>
              <p className="panel-sub">Practice-only — not sent to the operational exception queue</p>
              <ul className="list-plain">
                {evaluation.trainingWarnings.map((w) => (
                  <li key={w.message}>{w.message}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : (
        <section className="panel panel-pad" style={{ marginBottom: 14 }}>
          <h2 className="panel-title">No evaluation yet</h2>
          <button type="button" className="btn btn-primary" onClick={retryEvaluate} disabled={retrying}>
            {retrying ? "Evaluating…" : "Run evaluation"}
          </button>
        </section>
      )}

      <section className="panel panel-pad" style={{ marginBottom: 14 }}>
        <h2 className="panel-title">Full conversation transcript</h2>
        <div className="transcript-box">
          {(session.messages || [])
            .filter((m) => m.role !== "system")
            .map((m) => {
              const who = m.role === "representative" ? session.representativeName : session.participantName;
              return `${who}: ${m.content}`;
            })
            .join("\n")}
        </div>
      </section>

      <div className="page-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link
          href={`/practice/new?callType=${session.callType}&scenarioId=${session.scenarioId}&difficulty=${session.difficulty}`}
          className="btn btn-primary"
        >
          Practice again
        </Link>
        <Link href="/practice/new" className="btn btn-secondary">
          Try another scenario
        </Link>
        <Link
          href={`/practice/new?callType=${session.callType}&scenarioId=${session.scenarioId}&difficulty=${harder}`}
          className="btn btn-secondary"
        >
          Increase difficulty
        </Link>
        <Link href="/practice/history" className="btn btn-secondary">
          View practice history
        </Link>
      </div>
    </div>
  );
}
