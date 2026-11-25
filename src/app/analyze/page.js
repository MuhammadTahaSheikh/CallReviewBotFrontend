"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, Sparkles } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { CALL_TYPES, SCORING_PROFILES } from "../../lib/mock-data";

const SAMPLE_TRANSCRIPT = `Rep: Thanks for calling Northstar. How can I help today?
Caller: Hi, I'm interested in braces for myself. I'm 32.
Rep: Absolutely. What concerns you most about your smile right now?
Caller: Mostly crowding in the front, and cost.
Rep: Cost is a fair concern — we do offer payment plans. I'll keep this simple and walk through the options with you.
Caller: Okay.
Rep: Would Thursday afternoon work for a consult?
Caller: Maybe — can you email me?
Rep: I'll send a confirmation and reminder before your visit.`;

export default function AnalyzeCallPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [representativeName, setRepresentativeName] = useState("");
  const [businessName, setBusinessName] = useState("Northstar Clinic");
  const [callType, setCallType] = useState("sales");
  const [transcript, setTranscript] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  const profile = useMemo(() => SCORING_PROFILES[callType], [callType]);

  async function onFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".txt")) {
      setError("Only .txt transcript uploads are supported.");
      return;
    }
    if (file.size > 200_000) {
      setError("File is too large. Keep transcripts under 200 KB for this demo.");
      return;
    }
    const text = await file.text();
    setTranscript(text);
    setFileName(file.name);
    if (!title) setTitle(file.name.replace(/\.txt$/i, ""));
    setError("");
  }

  function loadSample() {
    setTitle("New patient inquiry — orthodontics");
    setRepresentativeName("Jordan Lee");
    setCallType("sales");
    setTranscript(SAMPLE_TRANSCRIPT);
    setFileName("");
    setError("");
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Call name is required.");
      return;
    }
    if (!transcript.trim() || transcript.trim().length < 40) {
      setError("Paste or upload a transcript with enough content to analyze.");
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          callType,
          transcript: transcript.trim(),
          representativeName: representativeName.trim(),
          businessName: businessName.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        const detail = data?.details?.[0]?.message;
        throw new Error(detail || data.error || "Analysis failed");
      }

      router.push(`/calls/${data.callId}`);
      router.refresh();
    } catch (err) {
      setError(err.message || "Analysis failed");
      setProcessing(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Analyze Call"
        description="Paste a transcript or upload a .txt file. Analysis is performed by live xAI (Grok)."
        actions={
          <button type="button" className="btn btn-secondary" onClick={loadSample}>
            <Sparkles size={16} />
            Load sample
          </button>
        }
      />

      <form className="panel panel-pad" onSubmit={onSubmit}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="title">Call name</label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. New patient inquiry"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="callType">Call type</label>
            <select id="callType" value={callType} onChange={(e) => setCallType(e.target.value)}>
              {CALL_TYPES.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="rep">Representative (optional)</label>
            <input
              id="rep"
              value={representativeName}
              onChange={(e) => setRepresentativeName(e.target.value)}
              placeholder="Jordan Lee"
            />
          </div>
          <div className="field">
            <label htmlFor="biz">Business (optional)</label>
            <input
              id="biz"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Business name"
            />
          </div>
          <div className="field full">
            <label htmlFor="transcript">Transcript</label>
            <textarea
              id="transcript"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste the full call transcript here…"
            />
          </div>
          <div className="field full">
            <label htmlFor="file">Or upload .txt</label>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <label className="btn btn-secondary" style={{ cursor: "pointer" }}>
                <FileUp size={16} />
                Choose file
                <input id="file" type="file" accept=".txt,text/plain" className="sr-only" onChange={onFileChange} />
              </label>
              <span className="muted" style={{ fontSize: "0.85rem" }}>
                {fileName || "No file selected"}
              </span>
            </div>
          </div>
        </div>

        <div
          className="panel"
          style={{
            marginTop: 16,
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: 14,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Scoring profile: {profile.label}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {profile.categories.map((cat) => (
              <span key={cat.key} className="badge badge-neutral">
                {cat.label} {cat.weight}%
              </span>
            ))}
          </div>
        </div>

        {error ? (
          <p role="alert" style={{ color: "var(--danger)", marginTop: 14, marginBottom: 0 }}>
            {error}
          </p>
        ) : null}

        <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
          <button type="submit" className="btn btn-primary" disabled={processing}>
            {processing ? (
              <>
                <Loader2 size={16} className="spin" />
                Analyzing…
              </>
            ) : (
              "Submit for analysis"
            )}
          </button>
          <span className="muted" style={{ alignSelf: "center", fontSize: "0.85rem" }}>
            Saves to SQLite and opens the persisted report.
          </span>
        </div>
      </form>
    </div>
  );
}
