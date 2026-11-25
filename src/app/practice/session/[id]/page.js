"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Square } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader";
import Badge from "../../../../components/ui/Badge";
import VoiceReplyBox from "../../../../components/practice/VoiceReplyBox";
import { callTypeLabel, formatDate } from "../../../../lib/format";

function formatDuration(sec) {
  const s = Math.max(0, sec || 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export default function PracticeSessionPage() {
  const { id } = useParams();
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [sending, setSending] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState("");
  const [typing, setTyping] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const bottomRef = useRef(null);
  const clientMsgCounter = useRef(0);

  async function load() {
    const res = await fetch(`/api/practice/sessions/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load session");
    setSession(data.session);
    return data.session;
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    if (!session?.startedAt || session.status !== "in_progress") return undefined;
    const tick = () => {
      const start = new Date(session.startedAt).getTime();
      setElapsed(Math.floor((Date.now() - start) / 1000));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [session?.startedAt, session?.status]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages, typing]);

  const canChat = session?.status === "in_progress";
  const visibleMessages = useMemo(() => session?.messages || [], [session]);

  async function handleSend({ content, inputMethod }) {
    if (!content?.trim() || sending || !canChat) return;
    setSending(true);
    setTyping(true);
    setError("");
    clientMsgCounter.current += 1;
    const clientMessageId = `${id}-${clientMsgCounter.current}`;
    try {
      const res = await fetch(`/api/practice/sessions/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          inputMethod: inputMethod || "text",
          clientMessageId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      setSession(data.session);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSending(false);
      setTyping(false);
    }
  }

  async function endAndEvaluate() {
    setEnding(true);
    setError("");
    try {
      const endRes = await fetch(`/api/practice/sessions/${id}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const endData = await endRes.json();
      if (!endRes.ok) throw new Error(endData.error || "Failed to end session");

      const evalRes = await fetch(`/api/practice/sessions/${id}/evaluate`, { method: "POST" });
      const evalData = await evalRes.json();
      if (!evalRes.ok) {
        setError(evalData.error || "Evaluation failed");
      }
      router.push(`/practice/session/${id}/results`);
    } catch (err) {
      setError(err.message);
      setEnding(false);
    }
  }

  if (!session && !error) {
    return <div className="panel panel-pad muted">Loading practice session…</div>;
  }

  if (!session) {
    return (
      <div className="panel panel-pad" style={{ color: "var(--danger)" }}>
        {error || "Session not found"}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={session.scenarioName}
        description={`${session.participantName} · ${callTypeLabel(session.callType)} · Live xAI customer`}
        actions={
          <button type="button" className="btn btn-danger" disabled={ending || !canChat} onClick={endAndEvaluate}>
            <Square size={16} />
            {ending ? "Ending…" : "End & Evaluate"}
          </button>
        }
      />

      <div className="practice-chat-meta">
        <Badge tone="info">{callTypeLabel(session.callType)}</Badge>
        <Badge tone="neutral">{session.difficulty}</Badge>
        <Badge tone="ok">Duration {formatDuration(elapsed)}</Badge>
        <Badge tone="info">Live xAI</Badge>
      </div>

      <section className="panel panel-pad practice-chat">
        <div className="practice-messages">
          {visibleMessages.map((m) => (
            <div
              key={m.id}
              className={`bubble ${
                m.role === "representative"
                  ? "bubble-representative"
                  : m.role === "system"
                    ? "bubble-system"
                    : "bubble-participant"
              }`}
            >
              {m.role !== "system" ? (
                <div className="bubble-meta">
                  {m.role === "representative" ? session.representativeName : session.participantName}
                  {m.inputMethod === "voice" ? " · voice" : ""}
                  {" · "}
                  {formatDate(m.createdAt)}
                </div>
              ) : null}
              {m.content}
            </div>
          ))}
          {typing ? <div className="typing-indicator">{session.participantName} is responding…</div> : null}
          <div ref={bottomRef} />
        </div>

        {canChat ? (
          <div style={{ marginTop: 12 }}>
            <VoiceReplyBox disabled={!canChat} sending={sending} onSend={handleSend} />
          </div>
        ) : (
          <div style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-primary" onClick={() => router.push(`/practice/session/${id}/results`)}>
              View results
            </button>
          </div>
        )}

        {error ? (
          <p role="alert" style={{ color: "var(--danger)", marginTop: 8 }}>
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}
