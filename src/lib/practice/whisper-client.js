"use client";

let transcriberPromise = null;

/**
 * Load transformers.js from CDN so Turbopack never bundles it.
 */
async function loadTransformersFromCdn() {
  const url = "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/+esm";
  const dynamicImport = new Function("u", "return import(u)");
  const mod = await dynamicImport(url);
  return mod?.default && mod.pipeline ? mod.default : mod;
}

export async function getWhisperTranscriber(onProgress) {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      const transformers = await loadTransformersFromCdn();
      const { pipeline, env } = transformers;
      if (!pipeline) throw new Error("Whisper pipeline missing from CDN module");

      if (env) {
        env.allowLocalModels = false;
        env.useBrowserCache = true;
      }

      return pipeline("automatic-speech-recognition", "Xenova/whisper-tiny.en", {
        progress_callback: (progress) => {
          if (typeof onProgress === "function") onProgress(progress);
        },
      });
    })().catch((err) => {
      transcriberPromise = null;
      throw err;
    });
  }
  return transcriberPromise;
}

function resampleTo16k(input, inputRate) {
  const targetRate = 16000;
  if (inputRate === targetRate) return input;
  const ratio = inputRate / targetRate;
  const newLength = Math.max(1, Math.round(input.length / ratio));
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i += 1) {
    const idx = i * ratio;
    const i0 = Math.floor(idx);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const frac = idx - i0;
    result[i] = input[i0] * (1 - frac) + input[i1] * frac;
  }
  return result;
}

function mixToMono(audioBuffer) {
  const channels = audioBuffer.numberOfChannels;
  if (channels === 1) return audioBuffer.getChannelData(0).slice(0);
  const len = audioBuffer.length;
  const out = new Float32Array(len);
  for (let c = 0; c < channels; c += 1) {
    const data = audioBuffer.getChannelData(c);
    for (let i = 0; i < len; i += 1) out[i] += data[i];
  }
  const inv = 1 / channels;
  for (let i = 0; i < len; i += 1) out[i] *= inv;
  return out;
}

/** Peak absolute amplitude 0..1 — used to detect silent recordings. */
export function audioPeak(samples) {
  let peak = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const v = Math.abs(samples[i]);
    if (v > peak) peak = v;
  }
  return peak;
}

/** Whisper tiny often ignores sub-second clips — pad to ~1s. */
function padToOneSecond(audio, rate = 16000) {
  const min = rate;
  if (audio.length >= min) return audio;
  const out = new Float32Array(min);
  out.set(audio);
  return out;
}

export async function blobToWhisperInput(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  try {
    const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    const mono = mixToMono(decoded);
    return resampleTo16k(mono, decoded.sampleRate);
  } finally {
    await audioCtx.close();
  }
}

/**
 * Record-only path: decode blob → Whisper in the browser.
 * Returns { text, peak } so the UI can tell silence from empty ASR.
 */
export async function transcribeAudioBlob(blob, onProgress) {
  const audio = await blobToWhisperInput(blob);
  const peak = audioPeak(audio);
  if (!audio.length || peak < 0.005) {
    return { text: "", peak };
  }

  const transcriber = await getWhisperTranscriber(onProgress);
  const padded = padToOneSecond(audio);

  const result = await transcriber(padded, {
    sampling_rate: 16000,
    return_timestamps: false,
  });
  const text = typeof result === "string" ? result : result?.text || "";
  return { text: String(text).trim(), peak };
}
