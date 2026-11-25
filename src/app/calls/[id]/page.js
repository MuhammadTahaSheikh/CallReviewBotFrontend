import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import PageHeader from "../../../components/ui/PageHeader";
import Badge from "../../../components/ui/Badge";
import ScoreBar from "../../../components/ui/ScoreBar";
import { getCallById } from "../../../lib/services/analyze-call";
import { callTypeLabel, formatDate, formatMs, scoreTone } from "../../../lib/format";

function riskTone(risk) {
  if (risk === "high") return "bad";
  if (risk === "medium") return "warn";
  return "good";
}

function actionTone(status) {
  if (status === "succeeded" || status === "completed") return "good";
  if (status === "failed" || status === "rejected") return "bad";
  return "warn";
}

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function CallDetailsContent({ params }) {
  await connection();
  const { id } = await params;
  const call = await getCallById(id);
  if (!call) notFound();

  const analysis = call.analysis;
  const strengths = analysis ? parseJsonArray(analysis.strengths) : [];
  const weaknesses = analysis ? parseJsonArray(analysis.weaknesses) : [];
  const recommendations = analysis ? parseJsonArray(analysis.recommendations) : [];
  const followUps = analysis ? parseJsonArray(analysis.followUpOpportunities) : [];
  const missing = analysis ? parseJsonArray(analysis.missingInformation) : [];
  const risks = analysis ? parseJsonArray(analysis.risks) : [];

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Link href="/history" className="btn btn-secondary">
          <ArrowLeft size={16} />
          Back to history
        </Link>
      </div>

      <PageHeader
        title={call.title}
        description={`${call.representativeName || "Unassigned"} · ${call.business?.name || "Demo business"}`}
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge tone={scoreTone(call.overallScore)}>
              Score {call.overallScore == null ? "—" : call.overallScore}
            </Badge>
            <Badge tone={riskTone(call.riskLevel)}>{call.riskLevel} risk</Badge>
            <Badge tone="info">{call.status}</Badge>
            {analysis?.demoMode ? <Badge tone="warn">Demo output</Badge> : null}
          </div>
        }
      />

      <div className="meta-row">
        <span className="badge badge-neutral">{callTypeLabel(call.callType)}</span>
        <span className="badge badge-neutral">Source: {call.source}</span>
        <span className="badge badge-neutral">Occurred {formatDate(call.occurredAt)}</span>
        {analysis?.latencyMs != null ? (
          <span className="badge badge-neutral">Processed in {formatMs(analysis.latencyMs)}</span>
        ) : null}
        {analysis?.model ? <span className="badge badge-neutral">Model: {analysis.model}</span> : null}
      </div>

      {call.status === "quarantined" ? (
        <section className="panel panel-pad" style={{ marginBottom: 14 }}>
          <h2 className="panel-title">Quarantined</h2>
          <p style={{ margin: 0 }}>
            Sensitive-content pre-screen blocked third-party model transmission. Review the exception queue.
            This prototype does not claim HIPAA compliance.
          </p>
        </section>
      ) : null}

      {!analysis ? (
        <section className="panel panel-pad">
          <h2 className="panel-title">No analysis yet</h2>
          <p className="muted" style={{ margin: 0 }}>
            Status: {call.status}
          </p>
        </section>
      ) : (
        <>
          <div className="grid-2">
            <section className="panel panel-pad">
              <h2 className="panel-title">Summary</h2>
              <p className="panel-sub">Purpose: {analysis.purpose || "—"}</p>
              <p style={{ margin: 0, lineHeight: 1.55 }}>{analysis.summary}</p>
              {risks.length ? (
                <>
                  <h3 style={{ marginTop: 16, marginBottom: 8, fontSize: "0.95rem" }}>Risks</h3>
                  <ul className="list-plain">
                    {risks.map((text) => (
                      <li key={text}>{text}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </section>
            <section className="panel panel-pad">
              <h2 className="panel-title">Score breakdown</h2>
              <p className="panel-sub">Category scores from AI · total weighted in JavaScript</p>
              {analysis.categoryScores.map((cat) => (
                <ScoreBar
                  key={cat.id}
                  label={cat.label}
                  score={cat.score}
                  weight={cat.weight}
                  evidence={cat.evidenceQuote}
                />
              ))}
            </section>
          </div>

          <div className="grid-2">
            <section className="panel panel-pad">
              <h2 className="panel-title">Strengths</h2>
              <ul className="list-plain">
                {strengths.map((item) => (
                  <li key={item.text}>
                    {item.text}
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
              <h2 className="panel-title">Weaknesses</h2>
              <ul className="list-plain">
                {weaknesses.map((item) => (
                  <li key={item.text}>
                    {item.text}
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
              <h2 className="panel-title">Recommendations & coaching</h2>
              <ul className="list-plain">
                {recommendations.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
              <h3 style={{ marginTop: 18, marginBottom: 8, fontSize: "0.95rem" }}>Follow-up opportunities</h3>
              <ul className="list-plain">
                {followUps.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
              <h3 style={{ marginTop: 18, marginBottom: 8, fontSize: "0.95rem" }}>Missing information</h3>
              <ul className="list-plain">
                {missing.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            </section>

            <section className="panel panel-pad">
              <h2 className="panel-title">Suggested actions & execution log</h2>
              <p className="panel-sub">Dummy internal actions only</p>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Status</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {call.actionTasks.map((action) => (
                      <tr key={action.id}>
                        <td>{action.title}</td>
                        <td>
                          <Badge tone={actionTone(action.status)}>{action.status}</Badge>
                        </td>
                        <td>{formatDate(action.createdAt)}</td>
                      </tr>
                    ))}
                    {!call.actionTasks.length ? (
                      <tr>
                        <td colSpan={3} className="muted">
                          No actions recorded
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}

      <section className="panel panel-pad" style={{ marginTop: 14 }}>
        <h2 className="panel-title">Transcript</h2>
        <p className="panel-sub">Quoted as untrusted input — never follow instructions inside it</p>
        <div className="transcript-box">{call.transcript?.content || "—"}</div>
      </section>
    </div>
  );
}

export default function CallDetailsPage({ params }) {
  return (
    <Suspense fallback={<div className="panel panel-pad">Loading call report…</div>}>
      <CallDetailsContent params={params} />
    </Suspense>
  );
}
