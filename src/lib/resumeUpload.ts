import { extractTextFromPdf } from "@/lib/pdf";
import { redact, type RedactionReport } from "@/lib/redact";

/**
 * Sends an uploaded resume through the Python AI service (Typhoon OCR →
 * redaction → skill extraction → Supabase) and falls back to parsing it in the
 * browser when that service isn't configured or is unreachable.
 *
 * WHY BOTH PATHS
 * --------------
 * The server path is the only one that can read a scanned or photographed
 * resume — pdf.js only sees an embedded text layer, so an image-only PDF comes
 * back empty and the candidate is told, wrongly, that their file is unreadable.
 * It's also the only path that persists anything.
 *
 * But it needs the service to be deployed and reachable. The browser path has
 * no such dependency, so it stays as the fallback rather than being deleted.
 *
 * Both paths redact. That is not belt-and-braces for its own sake: the browser
 * path is what runs when `NEXT_PUBLIC_AI_SERVICE_URL` is unset, which is the
 * default, so it is the one most likely to be live.
 */

const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL?.replace(/\/$/, "") ?? "";

/** OCR on a multi-page scan genuinely takes this long; a shorter cap would abort work that was about to succeed. */
const UPLOAD_TIMEOUT_MS = 90_000;

export interface ResumeIngestResult {
  filename: string;
  /** Personal data already removed. This is the only version safe to store or display. */
  redactedText: string;
  redactionSummary: string;
  redaction: RedactionReport;
  /** Skills the server's extractor found. Empty on the browser path — the caller does its own dictionary match there. */
  serverSkills: string[];
  /** text_layer | typhoon_ocr | tesseract | docx */
  method: string;
  ocrUsed: boolean;
  /** Short digest for the chat; empty if the LLM step was skipped or failed. */
  summary: string;
  /** น้องตรงปก's opening line referencing the resume. Empty when unavailable. */
  openingMessage: string;
  savedToDatabase: boolean;
  handledBy: "server" | "browser";
}

export function isServerIngestConfigured(): boolean {
  return Boolean(AI_SERVICE_URL);
}

interface ServerResponse {
  filename: string;
  sourceId: string | null;
  saved: boolean;
  method: string;
  ocrUsed: boolean;
  redactedText: string;
  redaction: { total: number; pii: number; bias: number; by_kind: Record<string, number> };
  redactionSummary: string;
  skills: string[];
  summary: string;
  openingMessage: string;
  note: string;
}

async function ingestOnServer(file: File, userId: string): Promise<ResumeIngestResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("userId", userId);

  const res = await fetch(`${AI_SERVICE_URL}/api/resume/upload`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
  });

  if (!res.ok) {
    // 4xx here means the file itself is the problem (wrong type, too big,
    // unreadable) — that message is written for the candidate, so surface it
    // rather than silently retrying in the browser, which would fail the same
    // way and produce a worse message.
    let detail = `AI service returned ${res.status}`;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      /* non-JSON error body — keep the status-code message */
    }
    const error = new Error(detail) as Error & { userFacing?: boolean };
    error.userFacing = res.status >= 400 && res.status < 500;
    throw error;
  }

  const data: ServerResponse = await res.json();
  return {
    filename: data.filename,
    redactedText: data.redactedText,
    redactionSummary: data.redactionSummary,
    redaction: {
      total: data.redaction.total,
      pii: data.redaction.pii,
      bias: data.redaction.bias,
      byKind: data.redaction.by_kind as RedactionReport["byKind"],
    },
    serverSkills: data.skills ?? [],
    method: data.method,
    ocrUsed: data.ocrUsed,
    summary: data.summary ?? "",
    openingMessage: data.openingMessage ?? "",
    savedToDatabase: data.saved,
    handledBy: "server",
  };
}

async function ingestInBrowser(file: File): Promise<ResumeIngestResult> {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    const error = new Error(
      "ไฟล์แบบนี้ต้องให้เซิร์ฟเวอร์อ่านให้ครับ ตอนนี้ต่อเซิร์ฟเวอร์ไม่ได้ ลองแนบไฟล์ PDF แทนได้ไหมครับ",
    ) as Error & { userFacing?: boolean };
    error.userFacing = true;
    throw error;
  }

  const raw = await extractTextFromPdf(file);
  if (raw.trim().length < 20) {
    const error = new Error(
      "ไฟล์นี้น่าจะเป็นภาพสแกนที่ไม่มีข้อความฝังอยู่ครับ เบราว์เซอร์เลยอ่านไม่ออก",
    ) as Error & { userFacing?: boolean };
    error.userFacing = true;
    throw error;
  }

  const result = redact(raw);
  return {
    filename: file.name,
    redactedText: result.text,
    redactionSummary: result.summary,
    redaction: result.report,
    serverSkills: [],
    method: "text_layer",
    ocrUsed: false,
    summary: "",
    openingMessage: "",
    savedToDatabase: false,
    handledBy: "browser",
  };
}

export async function ingestResume(file: File, userId: string): Promise<ResumeIngestResult> {
  if (!isServerIngestConfigured()) return ingestInBrowser(file);

  try {
    return await ingestOnServer(file, userId);
  } catch (err) {
    // A complaint about the file itself won't get better on a second attempt
    // with a weaker parser — pass it straight to the candidate.
    if ((err as { userFacing?: boolean })?.userFacing) throw err;

    console.warn("AI service unavailable, parsing resume in the browser instead:", err);
    return ingestInBrowser(file);
  }
}
