"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageHeader from "../../../components/ui/PageHeader";
import { CALL_TYPES } from "../../../lib/mock-data";

const DIFFICULTIES = [
  { id: "beginner", label: "Beginner", hint: "Cooperative, clear, simple questions" },
  { id: "intermediate", label: "Intermediate", hint: "Follow-ups, objections, occasional challenge" },
  { id: "advanced", label: "Advanced", hint: "Skeptical, frustrated, or demanding" },
];

export default function NewPracticePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [callType, setCallType] = useState(searchParams.get("callType") || "sales");
  const [scenarios, setScenarios] = useState([]);
  const [scenarioId, setScenarioId] = useState(searchParams.get("scenarioId") || "");
  const [difficulty, setDifficulty] = useState(searchParams.get("difficulty") || "intermediate");
  const [representativeName, setRepresentativeName] = useState("Practice Representative");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/practice/scenarios?callType=${callType}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load scenarios");
        setScenarios(data.scenarios || []);
        const preferred = searchParams.get("scenarioId");
        const exists = data.scenarios?.some((s) => s.id === preferred);
        setScenarioId(exists ? preferred : data.scenarios?.[0]?.id || "");
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [callType, searchParams]);

  const selected = useMemo(
    () => scenarios.find((s) => s.id === scenarioId) || null,
    [scenarios, scenarioId]
  );

  async function startPractice() {
    if (!scenarioId) return;
    setStarting(true);
    setError("");
    try {
      const res = await fetch("/api/practice/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId, difficulty, representativeName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start");
      router.push(`/practice/session/${data.session.id}`);
    } catch (err) {
      setError(err.message);
      setStarting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Start New Practice"
        description="Select a category and scenario. Hidden evaluation answers and full response trees are not shown before you start."
      />

      <div className="pill-note" style={{ marginBottom: 16 }}>
        Live xAI customer — Grok replies in character for the selected scenario.
      </div>

      <div className="panel panel-pad stack">
        <div className="form-grid">
          <div className="field">
            <label htmlFor="callType">Call category</label>
            <select id="callType" value={callType} onChange={(e) => setCallType(e.target.value)}>
              {CALL_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="difficulty">Difficulty</label>
            <select id="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              {DIFFICULTIES.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
            <span className="muted" style={{ fontSize: "0.78rem" }}>
              {DIFFICULTIES.find((d) => d.id === difficulty)?.hint}
            </span>
          </div>
          <div className="field full">
            <label htmlFor="scenario">Practice scenario</label>
            <select
              id="scenario"
              value={scenarioId}
              onChange={(e) => setScenarioId(e.target.value)}
              disabled={loading || !scenarios.length}
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="rep">Representative name</label>
            <input
              id="rep"
              value={representativeName}
              onChange={(e) => setRepresentativeName(e.target.value)}
            />
          </div>
        </div>

        {selected ? (
          <section
            style={{
              marginTop: 8,
              padding: 14,
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--surface-2)",
            }}
          >
            <h2 className="panel-title">Session preview</h2>
            <p className="panel-sub">
              Participant: {selected.participantName} · {selected.participantRole}
            </p>
            <p style={{ margin: "0 0 8px" }}>
              <strong>Personality:</strong> {selected.personality}
            </p>
            <p style={{ margin: "0 0 8px" }}>
              <strong>Background:</strong> {selected.description}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Objective:</strong> {selected.objective}
            </p>
          </section>
        ) : null}

        {error ? (
          <p role="alert" style={{ color: "var(--danger)", margin: 0 }}>
            {error}
          </p>
        ) : null}

        <div>
          <button type="button" className="btn btn-primary" disabled={starting || !scenarioId} onClick={startPractice}>
            {starting ? "Starting…" : "Start Practice"}
          </button>
        </div>
      </div>
    </div>
  );
}
