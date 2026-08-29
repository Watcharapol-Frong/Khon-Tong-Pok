"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";

/**
 * Push-to-talk button for the interview chat.
 *
 * WHY THE BROWSER API IS THE PRIMARY PATH
 * ---------------------------------------
 * `webkitSpeechRecognition` supports th-TH, streams interim results (so the
 * candidate watches their words appear as they speak, which is what makes it
 * feel like talking to someone rather than filling in a form), costs nothing,
 * and needs no server. On Chrome and Edge — which is what the judges will have
 * — it just works.
 *
 * Firefox and desktop Safari don't implement it. Rather than showing a mic
 * button that errors on click, the component detects that case and, if the AI
 * service reports a transcription backend, records with MediaRecorder and
 * posts the audio instead. If neither is available it renders nothing, so
 * there's no dead control on screen.
 *
 * NOTE ON PRIVACY: Chrome's implementation sends audio to Google's servers for
 * recognition. That's the same trade the platform already makes by calling a
 * hosted LLM, but it is worth knowing — the server path keeps audio inside our
 * own infrastructure if that ever matters.
 */

// Not in lib.dom as of TypeScript 5 — declared minimally rather than pulling
// in a dependency for a handful of fields.
interface SpeechRecognitionAlternative {
  transcript: string;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  0: SpeechRecognitionAlternative;
  length: number;
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResult;
  };
}
interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL?.replace(/\/$/, "") ?? "";

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERROR_MESSAGE: Record<string, string> = {
  "not-allowed": "เบราว์เซอร์ยังไม่อนุญาตให้ใช้ไมค์ครับ กดไอคอนกุญแจข้าง URL แล้วอนุญาตไมโครโฟนดูนะครับ",
  "service-not-allowed": "เบราว์เซอร์ยังไม่อนุญาตให้ใช้ไมค์ครับ ลองอนุญาตไมโครโฟนแล้วกดใหม่อีกทีครับ",
  "no-speech": "ไม่ได้ยินเสียงเลยครับ ลองพูดใกล้ไมค์อีกนิดแล้วกดใหม่ได้เลยครับ",
  network: "ต่อบริการถอดเสียงไม่ได้ครับ ลองพิมพ์แทนไปก่อนได้เลยครับ",
  "audio-capture": "หาไมโครโฟนไม่เจอครับ ลองเสียบไมค์หรือเลือกอุปกรณ์ในตั้งค่าเบราว์เซอร์ดูนะครับ",
};

interface VoiceInputProps {
  /** Fired once per utterance with the final text. */
  onResult: (text: string) => void;
  /** Fired continuously while speaking, so the caller can show live text in the input. */
  onInterim?: (text: string) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function VoiceInput({
  onResult,
  onInterim,
  onError,
  disabled = false,
  className = "",
}: VoiceInputProps) {
  const [mode, setMode] = useState<"checking" | "browser" | "server" | "none">("checking");
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  // Interim results arrive as replacements, not appends; the last final chunk
  // is kept here so a multi-sentence utterance doesn't lose its earlier half.
  const finalTextRef = useRef("");

  useEffect(() => {
    if (getSpeechRecognition()) {
      setMode("browser");
      return;
    }
    if (!AI_SERVICE_URL) {
      setMode("none");
      return;
    }

    let cancelled = false;
    fetch(`${AI_SERVICE_URL}/api/voice/capabilities`, { signal: AbortSignal.timeout(4000) })
      .then((r) => (r.ok ? r.json() : null))
      .then((caps) => {
        if (cancelled) return;
        setMode(caps?.serverTranscription ? "server" : "none");
      })
      .catch(() => {
        if (!cancelled) setMode("none");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Stop any in-flight capture if the page navigates away mid-sentence,
  // otherwise the mic indicator stays lit after the component is gone.
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startBrowser = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = "th-TH";
    // Single utterance: it ends itself on a natural pause, which matches
    // "say your answer, then it appears" better than an open mic the
    // candidate has to remember to switch off.
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    finalTextRef.current = "";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) finalTextRef.current += text;
        else interim += text;
      }
      const combined = (finalTextRef.current + interim).trim();
      if (combined) onInterim?.(combined);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      // Aborting on purpose (unmount, second click) reports as "aborted" —
      // that isn't something to tell the candidate about.
      if (event.error === "aborted") return;
      onError?.(ERROR_MESSAGE[event.error] ?? `ใช้ไมค์ไม่ได้ครับ (${event.error})`);
    };

    recognition.onend = () => {
      setIsListening(false);
      const text = finalTextRef.current.trim();
      if (text) onResult(text);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }, [onInterim, onError, onResult]);

  const startServer = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setIsListening(false);
        setIsTranscribing(true);
        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const form = new FormData();
          form.append("file", blob, "speech.webm");
          const res = await fetch(`${AI_SERVICE_URL}/api/voice/transcribe`, {
            method: "POST",
            body: form,
            signal: AbortSignal.timeout(120_000),
          });
          if (!res.ok) throw new Error(`transcribe returned ${res.status}`);
          const data = await res.json();
          if (data.text?.trim()) onResult(data.text.trim());
          else onError?.("ไม่ได้ยินเสียงเลยครับ ลองพูดใกล้ไมค์อีกนิดนะครับ");
        } catch (err) {
          console.error("Voice transcription failed:", err);
          onError?.("ถอดเสียงไม่สำเร็จครับ ลองพิมพ์แทนไปก่อนได้เลยครับ");
        } finally {
          setIsTranscribing(false);
          recorderRef.current = null;
        }
      };

      recorderRef.current = recorder;
      setIsListening(true);
      recorder.start();
    } catch (err) {
      console.error("Microphone unavailable:", err);
      onError?.(ERROR_MESSAGE["not-allowed"]);
    }
  }, [onResult, onError]);

  const toggle = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      recorderRef.current?.stop();
      setIsListening(false);
      return;
    }
    if (mode === "browser") startBrowser();
    else if (mode === "server") void startServer();
  }, [isListening, mode, startBrowser, startServer]);

  // A button that can't work is worse than no button — render nothing when
  // neither path is available.
  if (mode === "none" || mode === "checking") return null;

  const busy = disabled || isTranscribing;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label={isListening ? "หยุดพูด" : "พูดคำตอบด้วยเสียง"}
      aria-pressed={isListening}
      title={isListening ? "กดเพื่อหยุด" : "กดแล้วพูดได้เลย"}
      className={`relative flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-xl border transition-all active:scale-[0.95] disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10 ${
        isListening
          ? "border-transparent bg-[#E5484D] text-white"
          : "border-[rgba(15,15,15,0.12)] bg-white text-[#0F0F0F] hover:border-[#0F0F0F]"
      } ${className}`}
    >
      {isTranscribing ? (
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.25} />
      ) : isListening ? (
        <>
          <Square className="h-3.5 w-3.5 fill-current" strokeWidth={2.25} />
          <span className="absolute inset-0 animate-ping rounded-xl bg-[#E5484D] opacity-30" />
        </>
      ) : (
        <Mic className="h-4 w-4" strokeWidth={2.25} />
      )}
    </button>
  );
}
