"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff, Send } from "lucide-react";
import { transcribeAudioBlob } from "../../lib/practice/whisper-client";

function pickMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  if (typeof MediaRecorder === "undefined") return "";
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || "";
}

function micErrorMessage(err) {
  const name = err?.name || "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Microphone permission blocked. Click the lock/mic icon in the address bar → Allow, then try Speak again.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No microphone found by the browser. Check Windows privacy: Settings → Privacy → Microphone → allow desktop apps / your browser.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Mic is busy in another app (Zoom/Teams/Discord). Close that app, then try Speak again.";
  }
  if (name === "OverconstrainedError") {
    return "Could not open that mic with current settings. Pick another mic below, or try Speak again.";
  }
  return err?.message
    ? `Microphone error: ${err.message}`
    : "Could not open the microphone. Try Chrome/Edge on http://localhost:3000, or type your reply.";
}

/**
 * Speak → record → Stop → Whisper.
 * Does not run Web Speech at the same time (it can steal the mic).
 */
export default function VoiceReplyBox({ disabled, sending, onSend }) {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [usedVoice, setUsedVoice] = useState(false);
  const [level, setLevel] = useState(0);
  const [peakLevel, setPeakLevel] = useState(0);
  const [micReady, setMicReady] = useState(true);
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState("");
  const [activeMicLabel, setActiveMicLabel] = useState("");

  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(0);
  const peakLevelRef = useRef(0);

  useEffect(() => {
    setMicReady(typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia);
    refreshDevices();
    const onChange = () => refreshDevices();
    navigator.mediaDevices?.addEventListener?.("devicechange", onChange);
    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", onChange);
      stopLevelMeter();
      stopTracks();
    };
  }, []);

  async function refreshDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const inputs = all.filter((d) => d.kind === "audioinput");
      setDevices(inputs);
      setDeviceId((prev) => {
        if (prev && inputs.some((d) => d.deviceId === prev)) return prev;
        return inputs[0]?.deviceId || "";
      });
    } catch {
      /* ignore */
    }
  }

  function stopTracks() {
    mediaStreamRef.current?.getTracks?.().forEach((t) => t.stop());
    mediaStreamRef.current = null;
  }

  function stopLevelMeter() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    try {
      audioCtxRef.current?.close?.();
    } catch {
      /* ignore */
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
    setLevel(0);
  }

  function startLevelMeter(stream) {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {});
      }
      // Clone so metering never interferes with MediaRecorder tracks
      const meterStream = stream.clone();
      const source = audioCtx.createMediaStreamSource(meterStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      // Time-domain buffer must be fftSize (not frequencyBinCount)
      const data = new Uint8Array(analyser.fftSize);
      peakLevelRef.current = 0;

      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        let peak = 0;
        for (let i = 0; i < data.length; i += 1) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
          const a = Math.abs(v);
          if (a > peak) peak = a;
        }
        const rms = Math.sqrt(sum / data.length);
        const pct = Math.min(100, Math.round(Math.max(rms * 400, peak * 120)));
        if (pct > peakLevelRef.current) peakLevelRef.current = pct;
        setLevel(pct);
        setPeakLevel(peakLevelRef.current);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

      // Stop cloned tracks when context closes
      audioCtx.addEventListener("statechange", () => {
        if (audioCtx.state === "closed") {
          meterStream.getTracks().forEach((t) => t.stop());
        }
      });
    } catch (err) {
      console.warn("Level meter failed", err);
    }
  }

  async function startRecording() {
    setError("");
    setStatus("");
    setPeakLevel(0);
    peakLevelRef.current = 0;
    setActiveMicLabel("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Microphone API unavailable. Use Chrome or Edge at http://localhost:3000, or type your reply.");
      return;
    }

    try {
      // Prefer simple constraints — advanced ones fail on some Windows drivers
      const audio =
        deviceId
          ? { deviceId: { exact: deviceId }, echoCancellation: false, noiseSuppression: false, autoGainControl: true }
          : { echoCancellation: false, noiseSuppression: false, autoGainControl: true };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio });
      } catch (firstErr) {
        // Fallback: any default mic, no constraints
        if (deviceId) {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else {
          throw firstErr;
        }
      }

      const track = stream.getAudioTracks()[0];
      if (!track) {
        stream.getTracks().forEach((t) => t.stop());
        setError("Browser opened no audio track. Check Windows mic privacy for your browser.");
        return;
      }
      // Ensure track is live/unmuted
      track.enabled = true;
      try {
        await track.applyConstraints?.({ autoGainControl: true });
      } catch {
        /* optional */
      }

      mediaStreamRef.current = stream;
      setActiveMicLabel(track.label || "Default microphone");
      await refreshDevices();
      startLevelMeter(stream);

      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = (event) => {
        console.error("MediaRecorder error", event);
        setError("Recording failed. Please type your reply.");
        setRecording(false);
        stopLevelMeter();
        stopTracks();
      };

      mediaRecorderRef.current = recorder;
      recorder.start(100);
      setRecording(true);
      setStatus(`Recording on “${track.label || "mic"}” — speak, then click Stop`);
    } catch (err) {
      console.error("getUserMedia failed", err);
      setError(micErrorMessage(err));
      stopLevelMeter();
      stopTracks();
      setRecording(false);
    }
  }

  async function stopRecordingAndTranscribe() {
    const recorder = mediaRecorderRef.current;
    if (!recorder && !recording) return;

    setStatus("Finishing recording…");
    setRecording(false);

    const blob = await new Promise((resolve) => {
      if (!recorder) {
        resolve(new Blob([]));
        return;
      }
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        const type = recorder.mimeType || "audio/webm";
        resolve(new Blob(chunksRef.current, { type }));
      };
      recorder.onstop = finish;
      try {
        if (recorder.state === "recording") {
          try {
            recorder.requestData();
          } catch {
            /* older browsers */
          }
          recorder.stop();
        } else {
          finish();
        }
      } catch {
        finish();
      }
      // Safety timeout if onstop never fires
      setTimeout(finish, 1500);
    });

    stopLevelMeter();
    stopTracks();
    mediaRecorderRef.current = null;

    if (!blob || blob.size < 200) {
      setError("Recording was empty. Click Speak, allow the mic, talk for a second, then Stop.");
      setStatus("");
      return;
    }

    // Always try Whisper — do not reject based on the UI meter (it can be wrong).
    setTranscribing(true);
    setStatus(`Converting ${Math.round(blob.size / 1024)} KB of audio…`);

    try {
      const { text: transcript, peak } = await transcribeAudioBlob(blob, (progress) => {
        if (progress?.status === "progress" && progress?.file) {
          const pct = Math.round(progress.progress || 0);
          setStatus(`Downloading speech model… ${pct}%`);
        } else if (progress?.status === "ready" || progress?.status === "initiate") {
          setStatus("Loading speech model…");
        }
      });

      if (!transcript) {
        setError(
          peak < 0.008
            ? `Recording looked silent (mic: ${activeMicLabel || "unknown"}). Pick a different mic above, or check Windows → Privacy → Microphone.`
            : "Heard audio but could not convert it. Hold Speak a bit longer, then Stop — or type your reply."
        );
        setStatus("");
        return;
      }

      setText((prev) => `${prev} ${transcript}`.replace(/\s+/g, " ").trim());
      setUsedVoice(true);
      setStatus("Voice converted — review and press Send");
      setError("");
    } catch (err) {
      console.error(err);
      setError(
        "Voice conversion failed (needs internet once for the speech model). Retry Speak → Stop, or type your reply."
      );
      setStatus("");
    } finally {
      setTranscribing(false);
    }
  }

  function toggleMic() {
    if (transcribing) return;
    if (recording) stopRecordingAndTranscribe();
    else startRecording();
  }

  async function handleSend() {
    if (recording) await stopRecordingAndTranscribe();
    const content = text.trim();
    if (!content || disabled || sending || transcribing) return;
    await onSend({ content, inputMethod: usedVoice ? "voice" : "text" });
    setText("");
    setUsedVoice(false);
    setStatus("");
  }

  return (
    <div>
      {devices.length > 0 ? (
        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            marginBottom: 10,
            fontSize: "0.8rem",
            color: "var(--muted)",
          }}
        >
          Microphone
          <select
            value={deviceId}
            disabled={recording || transcribing || disabled}
            onChange={(e) => setDeviceId(e.target.value)}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--fg)",
            }}
          >
            {devices.map((d, i) => (
              <option key={d.deviceId || i} value={d.deviceId}>
                {d.label || `Microphone ${i + 1}`}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="practice-composer">
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setUsedVoice(false);
          }}
          placeholder={
            recording
              ? "Recording… click Stop when you finish speaking"
              : transcribing
                ? "Converting speech to text…"
                : "Type here, or Speak → talk → Stop"
          }
          disabled={disabled || transcribing}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button
          type="button"
          className={`btn btn-secondary ${recording ? "mic-active" : ""}`}
          onClick={toggleMic}
          disabled={disabled || transcribing}
          aria-pressed={recording}
        >
          {transcribing ? <Loader2 size={16} className="spin" /> : recording ? <MicOff size={16} /> : <Mic size={16} />}
          {transcribing ? "…" : recording ? "Stop" : "Speak"}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={disabled || sending || transcribing || !text.trim()}
          onClick={handleSend}
        >
          {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
          Send
        </button>
      </div>

      {recording ? (
        <div style={{ marginTop: 10 }}>
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              background: "var(--danger-soft)",
              color: "var(--danger)",
              fontWeight: 600,
              fontSize: "0.9rem",
              marginBottom: 8,
            }}
          >
            Using: {activeMicLabel || "microphone"} — speak, then Stop.
          </div>
          <div
            style={{
              height: 10,
              borderRadius: 999,
              background: "var(--surface-2)",
              overflow: "hidden",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.max(4, level)}%`,
                background: level > 6 ? "var(--accent)" : "var(--muted)",
                transition: "width 60ms linear",
              }}
            />
          </div>
          <p className="muted" style={{ fontSize: "0.78rem", margin: "6px 0 0" }}>
            {peakLevel < 6
              ? "Level still low — try the other mic in the dropdown (headset vs laptop)."
              : "Mic is picking up sound."}
          </p>
        </div>
      ) : null}

      {status ? (
        <p className="muted" style={{ margin: "8px 0 0", fontSize: "0.85rem" }}>
          {status}
        </p>
      ) : null}

      {!micReady ? (
        <p role="alert" style={{ color: "var(--warn)", marginTop: 8 }}>
          Microphone API missing. Open http://localhost:3000 in Chrome or Edge.
        </p>
      ) : null}

      {error ? (
        <p role="alert" style={{ color: "var(--danger)", marginTop: 8 }}>
          {error}
        </p>
      ) : (
        <p className="muted" style={{ fontSize: "0.78rem", margin: "8px 0 0" }}>
          Tip: pick “Microphone (EKSA H12E)” or “Microphone Array” above, then Speak → talk → Stop.
        </p>
      )}
    </div>
  );
}
