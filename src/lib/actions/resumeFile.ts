"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFFont, PDFPage, rgb } from "pdf-lib";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getJobSeekerProfile } from "./jobSeeker";

const MAX_RESUME_FILE_BYTES = 10 * 1024 * 1024; // matches the "PDF ไม่เกิน 10MB" copy already shown on /decoder's upload UI

/**
 * Real upload path — call right after /decoder's client-side pdfjs text
 * extraction succeeds, with the same File the candidate picked. Stored in
 * Vercel Blob with private access (resumes are PII; only readable through
 * the authenticated /api/resume/[jobSeekerId] route, never a bare public
 * URL). A fixed pathname + allowOverwrite means a fresh upload always
 * replaces the previous file, same "new resume replaces old" rule the
 * extracted-text/skills sync in syncComputerSkills already follows.
 * Upserts the profile row (not just update) since a candidate can reach
 * /decoder's file picker before any other save has created one yet.
 */
export async function uploadResumeFile(
  jobSeekerId: string,
  formData: FormData
): Promise<{ ok: true } | { error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "ไม่พบไฟล์ที่อัปโหลด" };
  if (file.type !== "application/pdf") return { error: "รองรับเฉพาะไฟล์ PDF เท่านั้น" };
  if (file.size > MAX_RESUME_FILE_BYTES) return { error: "ไฟล์ใหญ่เกินไป (สูงสุด 10MB)" };

  try {
    const blob = await put(`resumes/${jobSeekerId}.pdf`, file, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/pdf",
    });
    await prisma.jobSeekerProfile.upsert({
      where: { jobSeekerId },
      create: { jobSeekerId, computerSkills: [], resumeFileUrl: blob.url },
      update: { resumeFileUrl: blob.url },
    });
    return { ok: true };
  } catch (err) {
    console.error("uploadResumeFile failed:", err);
    return { error: "อัปโหลดไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }
}

// ---- PDF generation fallback (no real uploaded file on record) ----

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const TEXT_COLOR = rgb(0.06, 0.06, 0.06);
const MUTED_COLOR = rgb(0.4, 0.4, 0.4);
const ACCENT_COLOR = rgb(0.3, 0.49, 1); // matches the app's #4D7CFF accent

type ProfileForPdf = NonNullable<Awaited<ReturnType<typeof getJobSeekerProfile>>>;

/** Greedy word-wrap against the embedded font's real glyph widths — pdf-lib has no built-in wrapping. Splits on spaces only, which is fine for the Thai+English mixed content here since profile fields are short structured strings, not prose needing Thai word-segmentation. */
function wrapLine(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Mutable cursor over a growing page list — draws wrapped text and adds a new A4 page once `y` runs past the bottom margin, so callers don't have to think about pagination themselves. */
class PdfWriter {
  constructor(
    private doc: PDFDocument,
    private regular: PDFFont,
    private bold: PDFFont,
    public page: PDFPage,
    public y: number = PAGE_HEIGHT - MARGIN
  ) {}

  private ensureSpace(needed: number) {
    if (this.y - needed < MARGIN) {
      this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      this.y = PAGE_HEIGHT - MARGIN;
    }
  }

  heading(text: string) {
    this.ensureSpace(26);
    this.y -= 20;
    this.page.drawText(text, { x: MARGIN, y: this.y, size: 20, font: this.bold, color: TEXT_COLOR });
    this.y -= 6;
  }

  sectionTitle(text: string) {
    this.ensureSpace(28);
    this.y -= 18;
    this.page.drawText(text, { x: MARGIN, y: this.y, size: 12, font: this.bold, color: ACCENT_COLOR });
    this.y -= 4;
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_WIDTH - MARGIN, y: this.y },
      thickness: 0.75,
      color: rgb(0.85, 0.85, 0.85),
    });
    this.y -= 12;
  }

  paragraph(text: string, opts?: { size?: number; muted?: boolean; bullet?: boolean }) {
    const size = opts?.size ?? 10.5;
    const color = opts?.muted ? MUTED_COLOR : TEXT_COLOR;
    const indent = opts?.bullet ? 12 : 0;
    const prefix = opts?.bullet ? "• " : "";
    const lines = wrapLine(prefix + text, this.regular, size, CONTENT_WIDTH - indent);
    for (const line of lines) {
      this.ensureSpace(size + 5);
      this.y -= size + 5;
      this.page.drawText(line, { x: MARGIN + indent, y: this.y, size, font: this.regular, color });
    }
  }

  spacer(amount = 6) {
    this.y -= amount;
  }
}

function formatWorkExperienceLine(w: ProfileForPdf["workExperience"][number]): string {
  return `${w.jobTitle} ที่ ${w.companyName}${w.isCurrent ? " (ปัจจุบัน)" : ""}`;
}

function formatEducationLine(e: ProfileForPdf["education"][number]): string {
  return `${e.level} ${e.institution}${e.fieldOfStudy ? ` สาขา${e.fieldOfStudy}` : ""}`;
}

/**
 * Synthesizes a resume PDF from a candidate's structured profile fields —
 * the fallback for anyone HR unblinds who never uploaded a real PDF (used
 * /decoder's chat flow only, or the manual multi-step form). Renders
 * whatever sections have data; skips the rest, same "resolves to exactly
 * one of N states" convention already used for the text-only display this
 * replaces. Uploads the result to Blob and records it on resumeFileUrl so
 * later views reuse it instead of regenerating — call again (e.g. after the
 * candidate edits their profile) to refresh it.
 */
export async function generateResumePdfFromProfile(
  jobSeekerId: string
): Promise<{ ok: true } | { error: string }> {
  const [profile, jobSeeker] = await Promise.all([
    getJobSeekerProfile(jobSeekerId),
    prisma.jobSeeker.findUnique({ where: { id: jobSeekerId } }),
  ]);
  if (!jobSeeker) return { error: "ไม่พบผู้ใช้" };
  if (
    !profile ||
    (profile.computerSkills.length === 0 &&
      profile.workExperience.length === 0 &&
      profile.education.length === 0 &&
      profile.resumeRawText.trim().length === 0)
  ) {
    return { error: "ยังไม่มีข้อมูลโปรไฟล์พอสร้างเรซูเม่" };
  }

  try {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    const fontDir = path.join(process.cwd(), "prisma", "assets");
    const [regularBytes, boldBytes] = await Promise.all([
      readFile(path.join(fontDir, "IBMPlexSansThai-Regular.ttf")),
      readFile(path.join(fontDir, "IBMPlexSansThai-Bold.ttf")),
    ]);
    const regular = await doc.embedFont(regularBytes, { subset: true });
    const bold = await doc.embedFont(boldBytes, { subset: true });

    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const w = new PdfWriter(doc, regular, bold, page);

    w.heading(jobSeeker.name);
    if (profile.desiredPosition) {
      w.paragraph(`ตำแหน่งงานที่สนใจ: ${profile.desiredPosition}`, { muted: true });
    }
    w.spacer(10);

    if (profile.education.length > 0) {
      w.sectionTitle("ประวัติการศึกษา");
      for (const e of profile.education) w.paragraph(formatEducationLine(e), { bullet: true });
      w.spacer(8);
    }

    if (profile.workExperience.length > 0) {
      w.sectionTitle("ประสบการณ์ทำงาน");
      for (const wk of profile.workExperience) {
        w.paragraph(formatWorkExperienceLine(wk), { bullet: true });
        if (wk.responsibilities) w.paragraph(wk.responsibilities, { size: 9.5, muted: true });
      }
      w.spacer(8);
    }

    if (profile.computerSkills.length > 0) {
      w.sectionTitle("ทักษะคอมพิวเตอร์ / โปรแกรม");
      w.paragraph(profile.computerSkills.join(", "));
      w.spacer(8);
    }

    if (profile.languageSkills.length > 0) {
      w.sectionTitle("ทักษะภาษา");
      for (const l of profile.languageSkills) w.paragraph(l.language, { bullet: true });
      w.spacer(8);
    }

    if (
      profile.resumeRawText.trim().length > 0 &&
      profile.education.length === 0 &&
      profile.workExperience.length === 0
    ) {
      // Only the legacy case: text was extracted from a PDF that predates
      // this feature (no file on record) and the structured form was never
      // filled in — reproduce that text rather than showing an empty page.
      w.sectionTitle("ข้อความจากเรซูเม่ที่เคยอัปโหลด");
      w.paragraph(profile.resumeRawText, { size: 9.5 });
    }

    const bytes = await doc.save();
    const blob = await put(`resumes/${jobSeekerId}.pdf`, Buffer.from(bytes), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/pdf",
    });
    await prisma.jobSeekerProfile.update({
      where: { jobSeekerId },
      data: { resumeFileUrl: blob.url },
    });
    return { ok: true };
  } catch (err) {
    console.error("generateResumePdfFromProfile failed:", err);
    return { error: "สร้างไฟล์เรซูเม่ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }
}
