"use client";

import { useEffect, useRef, useState } from "react";

function getSpeechRecognitionCtor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

/**
 * Browser Web Speech API helper (Chrome / Edge best support).
 * Audio is not recorded or stored — only live text transcription.
 */
export function useSpeechRecognition() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const recognitionRef = useRef(null);
  const listeningRef = useRef(false);
  const finalChunkRef = useRef("");
  const onChunkRef = useRef(null);

  useEffect(() => {
    const Ctor = getSpeechRecognitionCtor();
    setSupported(Boolean(Ctor));
    if (!Ctor) return undefined;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      listeningRef.current = true;
      setListening(true);
      setError("");
    };

    recognition.onresult = (event) => {
      let interimText = "";
      let newlyFinal = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const piece = result[0]?.transcript || "";
        if (result.isFinal) newlyFinal += `${piece} `;
        else interimText += piece;
      }

      if (newlyFinal.trim()) {
        finalChunkRef.current = `${finalChunkRef.current} ${newlyFinal}`.replace(/\s+/g, " ").trim();
        if (onChunkRef.current) onChunkRef.current(finalChunkRef.current, "");
      }

      setInterim(interimText);
      if (onChunkRef.current) {
        onChunkRef.current(finalChunkRef.current, interimText);
      }
    };

    recognition.onerror = (event) => {
      // Intentional stop, or brief silence mid-utterance — keep listening
      if (event.error === "aborted" || event.error === "no-speech") return;

      listeningRef.current = false;
      setListening(false);
      setInterim("");

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Microphone permission denied. Allow mic access for this site, or type your reply.");
      } else if (event.error === "network") {
        setError("Speech service network error. Chrome/Edge speech often needs internet. You can still type.");
      } else if (event.error === "audio-capture") {
        setError("No microphone found. Check your device settings, or type instead.");
      } else {
        setError(`Speech error (${event.error}). You can continue by typing.`);
      }
    };

    recognition.onend = () => {
      // Some browsers end unexpectedly while continuous — restart if still intended
      if (listeningRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start();
          return;
        } catch {
          /* fall through */
        }
      }
      listeningRef.current = false;
      setListening(false);
      setInterim("");
    };

    recognitionRef.current = recognition;

    return () => {
      listeningRef.current = false;
      try {
        recognition.onend = null;
        recognition.stop();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    };
  }, []);

  async function ensureMicPermission() {
    if (!navigator?.mediaDevices?.getUserMedia) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch {
      setError("Microphone permission denied. Allow mic access in the browser address bar, or type your reply.");
      return false;
    }
  }

  async function start(onChunk) {
    setError("");
    setInterim("");
    finalChunkRef.current = "";
    onChunkRef.current = onChunk || null;

    if (!recognitionRef.current) {
      setError(
        "Speech recognition is not available in this browser. Use Chrome or Edge on desktop, or type your reply."
      );
      return false;
    }

    const allowed = await ensureMicPermission();
    if (!allowed) return false;

    try {
      // restart cleanly if needed
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
      listeningRef.current = true;
      recognitionRef.current.start();
      setListening(true);
      return true;
    } catch (err) {
      listeningRef.current = false;
      setListening(false);
      setError("Could not start microphone listening. Try again or type instead.");
      return false;
    }
  }

  function stop() {
    listeningRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
    const committed = finalChunkRef.current;
    const leftover = interim.trim();
    setInterim("");
    const combined = `${committed} ${leftover}`.replace(/\s+/g, " ").trim();
    return combined;
  }

  return {
    supported,
    listening,
    interim,
    error,
    start,
    stop,
    setError,
  };
}
