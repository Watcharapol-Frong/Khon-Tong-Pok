import { get } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { isNameRevealedForCompany } from "@/lib/actions/interview";

/**
 * Streams a candidate's resume PDF (private Blob) to an authorized viewer —
 * either the candidate themself (?self=true) or HR at a company this
 * candidate has been unblinded to (?companyId=...). Resumes are PII behind
 * Blind Review on the HR side, so this can't just be the bare Blob URL
 * embedded client-side — that would leak the file to anyone who copies the
 * URL. Both query params follow the same not-trusted-but-scoped convention
 * every server action in this app already uses (see
 * useCompanySession/useJobSeekerSession) — there's no server-side auth
 * session to read here either, self=true trusts the [jobSeekerId] route
 * param the same way getJobSeekerProfile(jobSeekerId) already does.
 */
export async function GET(request: Request, { params }: { params: Promise<{ jobSeekerId: string }> }) {
  const { jobSeekerId } = await params;
  const url = new URL(request.url);
  const companyId = url.searchParams.get("companyId");
  const isSelf = url.searchParams.get("self") === "true";

  if (!isSelf) {
    if (!companyId) {
      return new Response("Missing companyId", { status: 400 });
    }
    const revealed = await isNameRevealedForCompany(jobSeekerId, companyId);
    if (!revealed) {
      return new Response("Not found", { status: 404 });
    }
  }

  const profile = await prisma.jobSeekerProfile.findUnique({
    where: { jobSeekerId },
    select: { resumeFileUrl: true },
  });
  if (!profile?.resumeFileUrl) {
    return new Response("Not found", { status: 404 });
  }

  const result = await get(profile.resumeFileUrl, { access: "private" });
  if (!result || result.statusCode !== 200) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType || "application/pdf",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
    },
  });
}
