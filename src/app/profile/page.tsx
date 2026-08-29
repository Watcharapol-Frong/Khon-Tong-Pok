"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Camera,
  Check,
  ChevronDown,
  FileText,
  Gauge,
  GraduationCap,
  Handshake,
  Lightbulb,
  Loader2,
  MessageCircle,
  Pencil,
  Shuffle,
  Sparkle,
  Target,
  TrendingUp,
  User,
} from "lucide-react";
import { AssessmentStepBar } from "@/components/AssessmentStepBar";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { RadarChart } from "@/components/RadarChart";
import { ResumePreviewModal } from "@/components/ResumePreviewModal";
import { SkillIcon } from "@/components/SkillIcon";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import {
  generateAIResume,
  generateResumeGapAnalysis,
  getChatVerifications,
  getGameResult,
  getJobSeekerProfile,
  getJobSeekerSessionData,
  getResumeGapAnalysis,
} from "@/lib/actions/jobSeeker";
import { GAME_STAGES, JOBS, SOFT_SKILL_AXIS_META, SOFT_SKILL_AXIS_ORDER } from "@/lib/data";
import { getJobSeekerSessionIds } from "@/lib/jobSeekerSession";
import type { RadarAxisDatum, SoftSkillScores } from "@/lib/types";

type JobSeekerProfileData = Awaited<ReturnType<typeof getJobSeekerProfile>>;
type GameResultData = Awaited<ReturnType<typeof getGameResult>>;
type ChatVerificationsData = Awaited<ReturnType<typeof getChatVerifications>>;
type GapAnalysisData = Awaited<ReturnType<typeof getResumeGapAnalysis>>;

const GAME_ICONS: Record<"risk" | "flexibility" | "focus" | "collaboration", typeof Gauge> = {
  risk: Gauge,
  flexibility: Shuffle,
  focus: Target,
  collaboration: Handshake,
};

/**
 * Each game's dominant axis per the real scoring formula (ai/scoring/radar.py
 * on main — every axis is actually a weighted blend of multiple games, but
 * this picks the one each game contributes to most, for a simple 1-game →
 * 1-headline-axis accordion instead of showing all six weighted fractions):
 * BART → riskTolerance (70% of its own formula), WCST → learningAgility
 * (100%), Flanker → criticalThinking (85%, ahead of decisionMakingUnderPressure's
 * 70%), PGG → collaborationMindset (100%, ahead of resilienceAndAdaptability's 70%).
 */
const GAME_ID_TO_AXIS: Record<number, keyof SoftSkillScores> = {
  1: "riskTolerance",
  2: "learningAgility",
  3: "criticalThinking",
  4: "collaborationMindset",
};

function tierLabel(score: number): "จุดแข็ง" | "ตามเกณฑ์" | "ควรพัฒนา" {
  if (score >= 75) return "จุดแข็ง";
  if (score >= 50) return "ตามเกณฑ์";
  return "ควรพัฒนา";
}

const AXIS_ADVICE: Record<keyof SoftSkillScores, { high: string; low: string }> = {
  riskTolerance: {
    high: "รับความเสี่ยงที่คำนวณมาแล้วได้ดี เหมาะกับงานที่ต้องตัดสินใจเร็วภายใต้ความไม่แน่นอน",
    low: "ลองฝึกตัดสินใจในสถานการณ์ที่ข้อมูลไม่ครบถ้วนหรือมีความเสี่ยงมากขึ้น จะช่วยยกระดับด้านนี้ได้",
  },
  learningAgility: {
    high: "เรียนรู้กฎใหม่และปรับกลยุทธ์ได้ไว เหมาะกับงานที่เทคโนโลยีหรือกติกาเปลี่ยนบ่อย",
    low: "ลองฝึกปรับวิธีทำงานให้เร็วขึ้นเมื่อได้ฟีดแบ็กใหม่ แทนที่จะยึดวิธีเดิมนานเกินไป",
  },
  criticalThinking: {
    high: "โฟกัสและกรองสิ่งรบกวนได้ดี เหมาะกับงานที่ต้องใช้สมาธิและวิเคราะห์ต่อเนื่อง",
    low: "ลองฝึกวิเคราะห์ทีละขั้นก่อนตัดสินใจ โดยเฉพาะเมื่อมีสิ่งรบกวนเยอะรอบตัว",
  },
  decisionMakingUnderPressure: {
    high: "ตัดสินใจได้ดีแม้ภายใต้แรงกดดันหรือเวลาจำกัด เหมาะกับงานที่ต้อง react เร็ว",
    low: "ลองฝึกตัดสินใจภายใต้เวลาจำกัดบ่อยๆ จะช่วยลดความลังเลเมื่อเจอสถานการณ์กดดันจริง",
  },
  collaborationMindset: {
    high: "ทำงานร่วมกับผู้อื่นได้ราบรื่นและไว้ใจทีม เหมาะกับงานที่ต้องประสานงานเยอะ",
    low: "ลองฝึกทำงานในสถานการณ์ที่ผลลัพธ์ขึ้นกับความร่วมมือของทีมมากขึ้น จะช่วยพัฒนาด้านนี้ได้",
  },
  resilienceAndAdaptability: {
    high: "ปรับตัวและรับมือกับการเปลี่ยนแปลงกะทันหันได้ดี เหมาะกับสภาพแวดล้อมที่ไม่แน่นอน",
    low: "ลองฝึกรับมือกับการเปลี่ยนแปลงกะทันหันให้บ่อยขึ้น จะช่วยเพิ่มความยืดหยุ่นได้",
  },
};

export default function ProfilePage() {
  const router = useRouter();
  const { isMobile } = useBreakpoint();
  // On-screen size (px) of the square crop viewport in the adjust-photo
  // modal — sized close to how the avatar circle actually reads, not a
  // cramped fixed box, while still fitting small screens.
  const cropViewportSize = isMobile ? 300 : 420;
  const [appliedJobs, setAppliedJobs] = useState<string[]>([]);
  // Hard skills used to be their own third tab — moved into the left
  // column below the radar chart instead (see main render) so both
  // soft and hard skills are visible together up front, not hidden
  // behind a click.
  const [activeTab, setActiveTab] = useState<"feedback" | "matching" | "courses">("feedback");
  // Defaults are neutral placeholders, not a fabricated example person —
  // the real name comes from the candidate's resume (see /decoder) and
  // real skills come from what was actually extracted there. An empty
  // skills list is a legitimate, honest state ("go run the assessment
  // first"), not something to paper over with fake sample data.
  const [candidateName, setCandidateName] = useState<string>("ผู้สมัคร");
  // The name comes from the candidate's account (mirrored into
  // localStorage by /decoder on login), but stays editable here in case
  // the account name doesn't match what they'd want shown on their profile.
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [userSkills, setUserSkills] = useState<string[]>([]);
  // Full profile record (personal info, education, work experience,
  // languages) — kept separately from the derived userSkills above so
  // the "เรซูเม่ของคุณ" section can render the whole thing,
  // not just the skill list. Only ever populated from the database (see
  // the DB-hydration effect below); there's no localStorage-only version
  // of this since it never existed before this round.
  const [profile, setProfile] = useState<JobSeekerProfileData>(null);
  // null means "hasn't played the psychometric games yet" (a real, honest
  // state right now — real gameplay isn't wired up, only seeded test
  // candidates have a row) — not fabricated to 0% on every axis.
  const [gameResult, setGameResult] = useState<GameResultData>(null);
  const [chatVerifications, setChatVerifications] = useState<ChatVerificationsData>([]);
  // "ผลจากแบบทดสอบที่ 2" — null until generateResumeGapAnalysis has run at
  // least once (see the manual "วิเคราะห์ให้หน่อย" trigger below); a real
  // Gemini call, so this isn't auto-generated on every page view.
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysisData>(null);
  const [isGeneratingGapAnalysis, setIsGeneratingGapAnalysis] = useState(false);
  const [gapAnalysisError, setGapAnalysisError] = useState("");
  // Blind-candidate mascot until the candidate uploads a real photo —
  // same placeholder convention HR sees for un-revealed candidates.
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  // Adjust-photo modal state — a newly-picked file lands here first for
  // crop/zoom (same pattern as Instagram's "adjust" step) rather than
  // being saved as the avatar as-is.
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropImgSize, setCropImgSize] = useState<{ w: number; h: number } | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const cropDragRef = useRef<{ startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // localStorage isn't available during server render, so both the server
  // and the client's first (pre-hydration) pass render the neutral
  // defaults above — they match, so hydration is safe. This effect then
  // reads the real values after mount, same as the pre-existing pattern
  // this replaces. The setState-in-effect lint rule assumes state should
  // be derivable from props/other state; that doesn't apply to reading a
  // browser-only source the server can't see — a lazy-useState
  // initializer here causes a real hydration mismatch instead (verified).
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedName = localStorage.getItem("ktp_username");
    if (storedName) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCandidateName(storedName);
    }

    const storedSkills = localStorage.getItem("ktp_hard_skills");
    if (storedSkills) {
      try {
        const parsed = JSON.parse(storedSkills);
        if (Array.isArray(parsed)) {
          setUserSkills(parsed.filter((s): s is string => typeof s === "string"));
        }
      } catch {
        // Malformed localStorage value — ignore and keep the empty default
        // rather than crash the page over stale/corrupt data.
      }
    }

    const storedPhoto = localStorage.getItem("ktp_profile_photo");
    if (storedPhoto) {
      setProfilePhoto(storedPhoto);
    }
  }, []);

  // A returning candidate routed here straight from /login (see the
  // "complete" stage there) may be on a browser that's never touched
  // /decoder in this session — localStorage above would then be empty or
  // stale even though the database has their real profile. Best-effort:
  // if a job seeker session exists, the database wins over whatever
  // localStorage had.
  useEffect(() => {
    const ids = getJobSeekerSessionIds();
    if (!ids) return;
    let cancelled = false;
    Promise.all([
      getJobSeekerSessionData(ids.jobSeekerId),
      getJobSeekerProfile(ids.jobSeekerId),
      getGameResult(ids.jobSeekerId),
      getChatVerifications(ids.jobSeekerId),
      getResumeGapAnalysis(ids.jobSeekerId),
    ]).then(([session, profile, gameResult, chatVerifications, gapAnalysis]) => {
      if (cancelled) return;
      if (session) {
        setCandidateName(session.jobSeeker.name);
        localStorage.setItem("ktp_username", session.jobSeeker.name);
      }
      if (profile) {
        setProfile(profile);
        setUserSkills(profile.computerSkills);
        localStorage.setItem("ktp_hard_skills", JSON.stringify(profile.computerSkills));
      }
      setGameResult(gameResult);
      setChatVerifications(chatVerifications);
      setGapAnalysis(gapAnalysis);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Derived straight from the real GameResult row (or empty if there isn't
  // one yet) — same 6-axis taxonomy/labels/colors as Position.requiredSoftSkills
  // (see SOFT_SKILL_AXIS_ORDER's docstring), no more static mock numbers.
  const radarData: RadarAxisDatum[] = useMemo(() => {
    if (!gameResult) return [];
    return SOFT_SKILL_AXIS_ORDER.map((axis) => ({
      axis: SOFT_SKILL_AXIS_META[axis].en,
      value: gameResult[axis],
    }));
  }, [gameResult]);

  const axisChips = useMemo(() => {
    if (!gameResult) return [];
    return SOFT_SKILL_AXIS_ORDER.map((axis) => ({
      key: axis,
      th: SOFT_SKILL_AXIS_META[axis].th,
      value: gameResult[axis],
    }));
  }, [gameResult]);

  // Real strongest/weakest axis from this candidate's own GameResult —
  // replaces the old hardcoded "Collaboration Mindset 85%... Risk
  // Tolerance 60%" copy that showed identically to every candidate
  // regardless of their actual scores.
  const strongestAxis = useMemo(
    () => (axisChips.length === 0 ? null : axisChips.reduce((best, cur) => (cur.value > best.value ? cur : best))),
    [axisChips],
  );
  const weakestAxis = useMemo(
    () => (axisChips.length === 0 ? null : axisChips.reduce((worst, cur) => (cur.value < worst.value ? cur : worst))),
    [axisChips],
  );

  const verifiedSkillNames = useMemo(
    () => (chatVerifications ?? []).filter((v) => v.status === "verified").map((v) => v.skill),
    [chatVerifications],
  );

  const [expandedGameId, setExpandedGameId] = useState<number | null>(null);
  const [isResumePreviewOpen, setIsResumePreviewOpen] = useState(false);

  // Same "enough to write a resume from" gate generateAIResume/
  // generateResumePdfFromProfile use server-side — drives the bottom CTA's
  // copy below (upgrade vs. create from scratch).
  const hasResume = Boolean(
    profile && (profile.computerSkills.length > 0 || profile.workExperience.length > 0 || profile.education.length > 0),
  );

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string") return;
      // "Image" here is the next/image component (see import above), not
      // the DOM constructor — window.Image is the real HTMLImageElement.
      const img = new window.Image();
      img.onload = () => {
        const baseScale = cropViewportSize / Math.min(img.naturalWidth, img.naturalHeight);
        setCropImgSize({ w: img.naturalWidth, h: img.naturalHeight });
        setCropZoom(1);
        setCropOffset({
          x: (cropViewportSize - img.naturalWidth * baseScale) / 2,
          y: (cropViewportSize - img.naturalHeight * baseScale) / 2,
        });
        setCropSrc(dataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const cropBaseScale = cropImgSize ? cropViewportSize / Math.min(cropImgSize.w, cropImgSize.h) : 1;
  const cropScale = cropBaseScale * cropZoom;

  const clampCropOffset = (offset: { x: number; y: number }, scale: number) => {
    if (!cropImgSize) return offset;
    const dispW = cropImgSize.w * scale;
    const dispH = cropImgSize.h * scale;
    const minX = Math.min(0, cropViewportSize - dispW);
    const minY = Math.min(0, cropViewportSize - dispH);
    return {
      x: Math.min(0, Math.max(minX, offset.x)),
      y: Math.min(0, Math.max(minY, offset.y)),
    };
  };

  const handleCropZoomChange = (value: number) => {
    setCropZoom(value);
    setCropOffset((prev) => clampCropOffset(prev, cropBaseScale * value));
  };

  const handleCropPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    cropDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: cropOffset.x,
      startOffsetY: cropOffset.y,
    };
  };

  const handleCropPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cropDragRef.current) return;
    const drag = cropDragRef.current;
    setCropOffset(
      clampCropOffset(
        { x: drag.startOffsetX + (e.clientX - drag.startX), y: drag.startOffsetY + (e.clientY - drag.startY) },
        cropScale,
      ),
    );
  };

  const handleCropPointerUp = () => {
    cropDragRef.current = null;
  };

  const closeCropModal = () => {
    setCropSrc(null);
    setCropImgSize(null);
    // Reset so picking the same file again still fires onChange.
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirmCrop = () => {
    if (!cropSrc) return;
    const img = new window.Image();
    img.onload = () => {
      const OUTPUT_SIZE = 480;
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const srcSize = cropViewportSize / cropScale;
      ctx.drawImage(
        img,
        -cropOffset.x / cropScale,
        -cropOffset.y / cropScale,
        srcSize,
        srcSize,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE,
      );
      const outputUrl = canvas.toDataURL("image/jpeg", 0.92);
      setProfilePhoto(outputUrl);
      localStorage.setItem("ktp_profile_photo", outputUrl);
      closeCropModal();
    };
    img.src = cropSrc;
  };

  const startEditingName = () => {
    setNameDraft(candidateName);
    setIsEditingName(true);
  };

  const saveNameEdit = () => {
    const trimmed = nameDraft.trim();
    if (trimmed) {
      setCandidateName(trimmed);
      localStorage.setItem("ktp_username", trimmed);
    }
    setIsEditingName(false);
  };

  // Explicitly opt-in sample data for reviewing the job-match/course-gap
  // sections with something populated, since they're computed from real
  // localStorage the way this page always works — there's no way for
  // this app to write into a visitor's own browser storage from outside
  // it. Clearly labeled as a sample, not silently pretending to be a
  // real candidate's data.
  const handleLoadSampleData = () => {
    const sampleAllSkills = ["React", "TypeScript", "Node.js", "PostgreSQL", "Docker"];
    setUserSkills(sampleAllSkills);
    localStorage.setItem("ktp_hard_skills", JSON.stringify(sampleAllSkills));
  };

  // RadarChart takes a pixel `size`, not a CSS width, and computes label
  // font size / wrap width / dot radius directly from it — a hardcoded
  // size can't track how wide the panel actually renders (it just got
  // wider than Hard Skills, so 320px was leaving real space unused and
  // still crowding labels). Measuring the wrapper's real width keeps
  // this in sync. Same pattern as the HR candidate report's own radar.
  const chartResizeObserverRef = useRef<ResizeObserver | null>(null);
  const [chartSize, setChartSize] = useState(230);
  const chartWrapRefCallback = (el: HTMLDivElement | null) => {
    chartResizeObserverRef.current?.disconnect();
    chartResizeObserverRef.current = null;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (!width) return;
      // RadarChart's axis labels render outside its size×size box on
      // purpose (readability) — reserve headroom for that overflow
      // instead of using the full measured width as `size`.
      setChartSize(Math.max(200, Math.min(380, Math.floor(width * 0.6))));
    });
    observer.observe(el);
    chartResizeObserverRef.current = observer;
  };

  // "ให้น้องตรงปกช่วยสร้าง" — the Premium-badged button. The badge is a
  // forward-looking monetization label only; this is a real, working
  // Gemini call (see generateAIResume), not gated behind any payment flow
  // since none exists yet for this prototype.
  const [showAiModal, setShowAiModal] = useState(false);
  const [isGeneratingResume, setIsGeneratingResume] = useState(false);
  const [aiResumeResult, setAiResumeResult] = useState<string | null>(null);
  const [aiResumeError, setAiResumeError] = useState("");

  const handleGenerateAIResume = async () => {
    setShowAiModal(true);
    setAiResumeError("");
    setAiResumeResult(null);
    const ids = getJobSeekerSessionIds();
    if (!ids) {
      setAiResumeError("กรุณาเข้าสู่ระบบก่อน");
      return;
    }
    setIsGeneratingResume(true);
    const result = await generateAIResume(ids.jobSeekerId);
    setIsGeneratingResume(false);
    if ("error" in result) {
      setAiResumeError(result.error);
      return;
    }
    setAiResumeResult(result.summaryText);
  };

  const handleGenerateGapAnalysis = async () => {
    setGapAnalysisError("");
    const ids = getJobSeekerSessionIds();
    if (!ids) {
      setGapAnalysisError("กรุณาเข้าสู่ระบบก่อน");
      return;
    }
    setIsGeneratingGapAnalysis(true);
    const result = await generateResumeGapAnalysis(ids.jobSeekerId);
    if ("error" in result) {
      setIsGeneratingGapAnalysis(false);
      setGapAnalysisError(result.error);
      return;
    }
    // Refetch rather than hand-assemble the row — generateResumeGapAnalysis
    // returns only the content fields, not the full persisted record.
    const fresh = await getResumeGapAnalysis(ids.jobSeekerId);
    setIsGeneratingGapAnalysis(false);
    setGapAnalysis(fresh);
  };

  const handleConfirmProfileAndGoToJobs = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ktp_confirmed_skills", JSON.stringify(userSkills));
      localStorage.setItem("ktp_profile_verified", "true");
    }
    router.push("/job");
  };

  // Computed from real extracted hard skills — no fabricated match
  // percentages or reasoning text disconnected from what the candidate
  // actually has. Kept as one shared computation (not just the top 4)
  // so the course-gap analysis below can look at the same real
  // requiredSkills/missingSkills instead of a separately fudged list.
  const jobsWithSkillMatch = useMemo(() => {
    return JOBS.map((job) => {
      const requiredSkills = job.hardSkills
        .split("·")
        .map((s) => s.trim())
        .filter(Boolean);

      const matchedSkills = requiredSkills.filter((required) =>
        userSkills.some(
          (owned) =>
            owned.toLowerCase().includes(required.toLowerCase()) ||
            required.toLowerCase().includes(owned.toLowerCase()),
        ),
      );
      const missingSkills = requiredSkills.filter((s) => !matchedSkills.includes(s));

      const matchRate = requiredSkills.length
        ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
        : 0;

      return { ...job, matchRate, matchedSkills, missingSkills };
    });
  }, [userSkills]);

  // A job only appears here if it genuinely shares at least one skill
  // with the candidate; nothing is padded to look good.
  const recommendedJobs = useMemo(
    () =>
      jobsWithSkillMatch
        .filter((job) => job.matchedSkills.length > 0)
        .sort((a, b) => b.matchRate - a.matchRate)
        .slice(0, 4),
    [jobsWithSkillMatch],
  );

  // Course "recommendations" as a real skill-gap analysis — the skills
  // most frequently missing across the candidate's own top job matches,
  // not a static list tied to mock soft-skill scores. Only surfaces
  // skills that would genuinely move the needle on a job the candidate
  // already has some traction with.
  const skillGapCourses = useMemo(() => {
    const gapCounts = new Map<string, { count: number; jobTitles: string[] }>();
    for (const job of recommendedJobs) {
      for (const skill of job.missingSkills) {
        const entry = gapCounts.get(skill) ?? { count: 0, jobTitles: [] };
        entry.count += 1;
        entry.jobTitles.push(job.title);
        gapCounts.set(skill, entry);
      }
    }
    return Array.from(gapCounts.entries())
      .map(([skill, { count, jobTitles }]) => ({ skill, count, jobTitles }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 2);
  }, [recommendedJobs]);

  // Applying isn't reversible from here (no "un-apply" affordance below),
  // so a misclick shouldn't be able to submit one — the button opens this
  // confirm step instead of calling handleApply directly.
  const [confirmApplyJob, setConfirmApplyJob] = useState<{ title: string; company: string } | null>(null);

  const handleApply = (title: string) => {
    if (!appliedJobs.includes(title)) {
      setAppliedJobs((prev) => [...prev, title]);
    }
  };

  const handleConfirmApply = () => {
    if (confirmApplyJob) handleApply(confirmApplyJob.title);
    setConfirmApplyJob(null);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FFFFFF] text-[#0F0F0F]">
      <Navbar />
      <AssessmentStepBar currentStep={4} />

      <div className="relative mx-auto w-full max-w-[1400px] px-3 sm:px-[clamp(20px,4vw,56px)] pt-4 sm:pt-[clamp(32px,5vw,48px)] pb-[clamp(56px,8vw,88px)]">
        {/* Profile Banner / Header */}
        <div className="mb-6 sm:mb-8 rounded-[24px] sm:rounded-[28px] bg-[#F5F5F5] p-4 sm:p-[clamp(24px,4vw,40px)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <label
                className="group relative flex h-12 w-12 sm:h-16 sm:w-16 flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-[#E5E5E5]"
                title="อัปโหลดรูปโปรไฟล์"
              >
                {profilePhoto ? (
                  <Image src={profilePhoto} alt="" width={64} height={64} className="h-full w-full object-cover" />
                ) : (
                  // Plain gray placeholder — the previous mascot fallback
                  // read as "this is the candidate's actual avatar," not
                  // "no photo uploaded yet." A generic silhouette is the
                  // standard, unambiguous way to signal "add your own."
                  <User className="h-6 w-6 sm:h-8 sm:w-8 text-[#9A9A9A]" strokeWidth={1.75} />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 text-[9px] font-bold text-white opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                  แก้ไข
                </div>
                {/* Always-visible edit badge — the hover-only overlay above
                    is invisible until you happen to hover, which touch
                    devices never trigger at all. This is the real
                    "you can change this" affordance. */}
                <div className="absolute right-0 bottom-0 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-[#0F0F0F] ring-2 ring-white">
                  <Camera className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" strokeWidth={2.5} />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  className="sr-only"
                />
              </label>
              <div className="min-w-0 flex-1">
                {isEditingName ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      autoFocus
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveNameEdit();
                        if (e.key === "Escape") setIsEditingName(false);
                      }}
                      className="min-w-0 rounded-lg border border-[rgba(15,15,15,0.15)] bg-white px-2 py-1 text-base sm:text-xl font-extrabold tracking-[-0.02em] text-[#0F0F0F] outline-none focus:border-[#0F0F0F]"
                    />
                    <button
                      type="button"
                      onClick={saveNameEdit}
                      aria-label="บันทึกชื่อ"
                      className="flex h-6 w-6 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#0F0F0F] text-white"
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-base sm:text-xl md:text-2xl font-extrabold tracking-[-0.02em] text-[#0F0F0F]">
                      คุณ {candidateName}
                    </h1>
                    {/* น้องตรงปกเดาชื่อจากเรซูเม่ให้ — ไม่ใช่ข้อมูลที่ยืนยัน
                        แล้ว 100% เสมอไป จึงต้องแก้ไขได้ตรงนี้เลย */}
                    <button
                      type="button"
                      onClick={startEditingName}
                      aria-label="แก้ไขชื่อ"
                      className="cursor-pointer text-[#8A8A8A] opacity-60 transition-opacity hover:text-[#0F0F0F] hover:opacity-100"
                    >
                      <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Resume source — checks whether this candidate has a real PDF on
            file (resumeFileUrl — either their own upload or one generated
            from the structured form, see uploadResumeFile/
            generateResumePdfFromProfile), just extracted text from an
            older upload that predates that field, structured data from
            the manual form, or neither — always resolves to exactly one
            of those states instead of ever rendering blank/broken. Same
            compact-card + modal pattern as HR's /company/candidates/[id]
            report, viewed via /api/resume/[id]?self=true instead of
            ?companyId=... — the candidate viewing their own file skips
            the Blind Review gate that route enforces for HR. */}
        <div className="mb-6 sm:mb-8 rounded-[24px] sm:rounded-[28px] bg-[#F5F5F5] p-4 sm:p-[clamp(24px,4vw,40px)]">
          <h2 className="mb-3 text-sm font-extrabold text-[#0F0F0F]">เรซูเม่ของคุณ</h2>
          {profile?.resumeFileUrl ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(77,124,255,0.1)]">
                  <FileText className="h-4 w-4 text-[#4D7CFF]" strokeWidth={2} />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#0F0F0F]">เรซูเม่ (PDF)</div>
                  <div className="text-[10px] text-[#8A8A8A]">อัปโหลดแล้ว</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsResumePreviewOpen(true)}
                className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-[#0F0F0F] px-3.5 py-2 text-[11px] font-bold text-white transition-opacity hover:opacity-90"
              >
                <FileText className="h-3 w-3" strokeWidth={2.5} />
                เปิดไฟล์
              </button>
            </div>
          ) : profile && profile.resumeRawText.trim().length > 0 ? (
            <div className="rounded-2xl bg-white p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold text-[#0F0F0F]">
                <FileText className="h-4 w-4 flex-shrink-0 text-[#4D7CFF]" strokeWidth={2} />
                ข้อความที่สกัดจากเรซูเม่ PDF ที่คุณอัปโหลด
              </div>
              <p className="max-h-[240px] overflow-y-auto rounded-xl bg-[#FAFAFA] p-3 text-xs leading-relaxed whitespace-pre-wrap text-[#5C5C5C]">
                {profile.resumeRawText}
              </p>
            </div>
          ) : profile &&
            (profile.desiredPosition || profile.education.length > 0 || profile.workExperience.length > 0) ? (
            <div className="flex flex-col gap-3">
              <p className="text-[11px] text-[#8A8A8A]">ข้อมูลจากฟอร์มที่คุณกรอกไว้ (ยังไม่ได้อัปโหลดเรซูเม่ PDF)</p>
              {profile.desiredPosition && (
                <div className="rounded-2xl bg-white p-3.5">
                  <div className="text-[10px] font-bold text-[#8A8A8A]">ตำแหน่งงานที่สนใจ</div>
                  <div className="text-xs font-extrabold text-[#0F0F0F]">{profile.desiredPosition}</div>
                </div>
              )}
              {profile.education.length > 0 && (
                <div className="rounded-2xl bg-white p-3.5">
                  <div className="mb-1.5 text-[10px] font-bold text-[#8A8A8A]">ประวัติการศึกษา</div>
                  <div className="flex flex-col gap-1">
                    {profile.education.map((e) => (
                      <div key={e.id} className="text-xs text-[#0F0F0F]">
                        {e.level} · {e.institution}
                        {e.fieldOfStudy ? ` · สาขา${e.fieldOfStudy}` : ""}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {profile.workExperience.length > 0 && (
                <div className="rounded-2xl bg-white p-3.5">
                  <div className="mb-1.5 text-[10px] font-bold text-[#8A8A8A]">ประสบการณ์ทำงาน</div>
                  <div className="flex flex-col gap-1">
                    {profile.workExperience.map((w) => (
                      <div key={w.id} className="text-xs text-[#0F0F0F]">
                        {w.jobTitle} · {w.companyName}
                        {w.isCurrent ? " (ปัจจุบัน)" : ""}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs leading-relaxed text-[#8A8A8A]">
              คุณยังไม่มีเรซูเม่ในระบบ — เลือกวิธีสร้างเรซูเม่ได้ที่ด้านล่างของหน้านี้
            </p>
          )}
        </div>

        {/* Big Dashboard — one merged card under a single "Dynamic Smart
            Profile" heading, with Soft Skills and Hard Skills as two
            clearly-separated sub-sections (divider, own sub-heading each)
            rather than two headings both claiming to be the topic. Soft
            Skills gets more room since the radar chart and its six axis
            labels need real space to render without crowding; Hard Skills
            is a plain skill list and needs comparatively little. Both
            fully visible, nothing hidden behind a tab or a narrow sidebar. */}
        <div className="mb-10 rounded-[24px] sm:rounded-[28px] bg-[#F5F5F5] p-4 sm:p-7">
          <h2 className="mb-5 text-lg sm:text-2xl font-extrabold text-[#0F0F0F] sm:mb-7">
            Dynamic Smart Profile
          </h2>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr] lg:gap-0">
            {/* Soft Skills */}
            <div className="lg:pr-8">
              <div className="inline-flex items-center rounded-full bg-[#0F0F0F] px-3 py-1 text-[11px] font-extrabold tracking-[0.03em] text-white uppercase">
                Soft Skills
              </div>
              <h3 className="mt-2.5 text-base sm:text-lg font-extrabold text-[#0F0F0F]">
                กราฟ Soft Skills 6 ด้าน
              </h3>
              <p className="mt-0.5 text-[11px] sm:text-xs text-[#5C5C5C]">
                ประมวลผลจากมินิเกม Neuroscience
              </p>

              {gameResult ? (
                <>
                  {/* Radar sized from the wrapper's real measured width instead
                      of a fixed 230/320px — lets it actually use the extra
                      room this panel now has instead of leaving it empty
                      while axis labels still crowd each other. */}
                  <div ref={chartWrapRefCallback} className="my-4 sm:my-6 flex justify-center w-full overflow-hidden">
                    <RadarChart data={radarData} size={chartSize} theme="mono" showLabels showValues animate />
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-2.5 sm:grid-cols-3">
                    {axisChips.map((chip) => (
                      <div
                        key={chip.key}
                        className="rounded-xl bg-white p-2 sm:p-3 text-center text-xs"
                      >
                        <div className="font-extrabold text-[#0F0F0F]">{chip.value}%</div>
                        <div className="text-[10px] leading-snug sm:text-[11px] opacity-70">{chip.th}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                // Honest empty state — no GameResult row yet means the
                // candidate hasn't played the psychometric games, not that
                // every axis genuinely scored 0.
                <div className="my-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[rgba(15,15,15,0.15)] bg-white px-4 py-10 text-center sm:my-6">
                  <Target className="h-6 w-6 text-[#8A8A8A]" strokeWidth={1.75} />
                  <p className="text-xs font-bold text-[#0F0F0F]">ยังไม่มีผลประเมิน Soft Skills</p>
                  <p className="max-w-[260px] text-[11px] text-[#8A8A8A]">
                    เล่นมินิเกมประเมินศักยภาพให้ครบเพื่อดูกราฟ 6 ด้านของคุณ
                  </p>
                  <Link
                    href="/play"
                    className="mt-1 rounded-full bg-[#0F0F0F] px-4 py-2 text-[11px] font-bold text-white transition-opacity hover:opacity-90"
                  >
                    ไปเล่นเกมประเมิน →
                  </Link>
                </div>
              )}
            </div>

            {/* Divider — horizontal rule when stacked on mobile, vertical
                rule when side-by-side on desktop — makes clear these are
                two distinct sub-sections, not one continuous topic. */}
            <div className="border-t border-[rgba(15,15,15,0.08)] pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
              {/* Hard Skills */}
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="inline-flex items-center rounded-full bg-[#0F0F0F] px-3 py-1 text-[11px] font-extrabold tracking-[0.03em] text-white uppercase">
                    Hard Skills
                  </div>
                  <h3 className="mt-2.5 text-base sm:text-lg font-extrabold text-[#0F0F0F]">
                    ทักษะที่สกัดได้
                  </h3>
                  <p className="mt-0.5 text-[11px] sm:text-xs text-[#5C5C5C]">
                    จากเรซูเม่และบทสนทนากับน้องตรงปก
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#0F0F0F]">
                  {userSkills.length} ทักษะ
                </span>
              </div>
              {/* Always visible, not just when the skills list is empty —
                  a completed Smart Profile isn't locked; the candidate can
                  still re-upload a resume or chat more to add to it. */}
              <Link
                href="/decoder"
                className="mt-2 inline-block text-[11px] font-bold text-[#4D7CFF] underline underline-offset-2 hover:text-[#0F0F0F]"
              >
                แก้ไข / อัปเดตทักษะ
              </Link>
              <div className="mt-4">
              {userSkills.length === 0 && (
                <div>
                  <p className="text-xs leading-[1.7] text-[#8A8A8A]">
                    ยังไม่มีทักษะที่สกัดได้ — ไปที่{" "}
                    <Link href="/decoder" className="font-bold text-[#0F0F0F] underline">
                      ห้องสนทนากับน้องตรงปก
                    </Link>{" "}
                    เพื่อวิเคราะห์ทักษะจากเรซูเม่หรือประสบการณ์ของคุณ
                  </p>
                  <button
                    type="button"
                    onClick={handleLoadSampleData}
                    className="mt-2 cursor-pointer text-xs font-bold text-[#4D7CFF] underline underline-offset-2"
                  >
                    หรือลองโหลดข้อมูลตัวอย่างเพื่อดูตัวอย่างหน้านี้
                  </button>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {userSkills.map((skill) => (
                  <div
                    key={skill}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-[#0F0F0F]"
                  >
                    <SkillIcon skill={skill} size={14} />
                    <span>{skill}</span>
                  </div>
                ))}
              </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insights & Recommended Jobs — full width below the dashboard */}
        <div className="mb-10 flex flex-col gap-6">
          {/* Dashboard Tabs (Fixed Layout Shift) */}
            <div className="flex gap-6 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab("feedback")}
                className={`cursor-pointer inline-flex items-center gap-1.5 pb-3 text-xs font-extrabold transition-all border-b-2 whitespace-nowrap ${
                  activeTab === "feedback"
                    ? "border-[#0F0F0F] text-[#0F0F0F]"
                    : "border-transparent text-[#8A8A8A] hover:text-[#0F0F0F]"
                }`}
              >
                <FileText className="h-3.5 w-3.5" strokeWidth={2} />
                รายงานข้อมูลส่วนบุคคล
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("matching")}
                className={`cursor-pointer inline-flex items-center gap-1.5 pb-3 text-xs font-extrabold transition-all border-b-2 whitespace-nowrap ${
                  activeTab === "matching"
                    ? "border-[#0F0F0F] text-[#0F0F0F]"
                    : "border-transparent text-[#8A8A8A] hover:text-[#0F0F0F]"
                }`}
              >
                <Briefcase className="h-3.5 w-3.5" strokeWidth={2} />
                ตำแหน่งงานที่น้องตรงปก แนะนำ ({recommendedJobs.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("courses")}
                className={`cursor-pointer inline-flex items-center gap-1.5 pb-3 text-xs font-extrabold transition-all border-b-2 whitespace-nowrap ${
                  activeTab === "courses"
                    ? "border-[#0F0F0F] text-[#0F0F0F]"
                    : "border-transparent text-[#8A8A8A] hover:text-[#0F0F0F]"
                }`}
              >
                <GraduationCap className="h-3.5 w-3.5" strokeWidth={2} />
                คอร์สเรียนที่แนะนำ ({skillGapCourses.length})
              </button>
            </div>

            {/* TAB 1: รายงานข้อมูลส่วนบุคคล (Feedback & Development Roadmap) */}
            {activeTab === "feedback" && (
              <div className="flex flex-col gap-6 rounded-2xl bg-[#FAFAFA] p-6">
                <div>
                  <h3 className="text-base font-extrabold text-[#0F0F0F]">
                    รายงานวิเคราะห์ศักยภาพรายบุคคล
                  </h3>
                  <p className="mt-1 text-xs text-[#5C5C5C]">
                    คำแนะนำจาก น้องตรงปก เพื่อต่อยอด Career Roadmap ของคุณ
                  </p>
                </div>

                {strongestAxis && weakestAxis ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-[rgba(59,245,92,0.3)] bg-[rgba(59,245,92,0.08)] p-4">
                      <div className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-[#0F0F0F]">
                        <TrendingUp className="h-3.5 w-3.5 text-[#0f5c22]" strokeWidth={2} />
                        จุดแข็งที่โดดเด่น
                      </div>
                      <p className="text-xs leading-[1.7] text-[#4A4A4A]">
                        {strongestAxis.th} ทำได้ {strongestAxis.value}% — {AXIS_ADVICE[strongestAxis.key].high}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[rgba(255,110,92,0.3)] bg-[rgba(255,110,92,0.08)] p-4">
                      <div className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-[#0F0F0F]">
                        <Target className="h-3.5 w-3.5 text-[#d63d28]" strokeWidth={2} />
                        จุดที่พัฒนาต่อได้
                      </div>
                      <p className="text-xs leading-[1.7] text-[#4A4A4A]">
                        {weakestAxis.th} อยู่ที่ {weakestAxis.value}% — {AXIS_ADVICE[weakestAxis.key].low}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[rgba(15,15,15,0.15)] p-6 text-center">
                    <p className="text-xs font-bold text-[#0F0F0F]">ยังไม่มีผลประเมิน Soft Skills</p>
                    <p className="mt-1 text-[11px] text-[#8A8A8A]">
                      เล่นมินิเกมประเมินศักยภาพก่อน ระบบจะวิเคราะห์จุดแข็ง/จุดพัฒนาให้ที่นี่
                    </p>
                    <Link href="/play" className="mt-3 inline-block text-xs font-bold text-[#4D7CFF] underline">
                      ไปเล่นมินิเกม →
                    </Link>
                  </div>
                )}

                {/* Per-game breakdown — accordion so all 4 games don't
                    compete for space with the strength/growth boxes above
                    by default. Each game's "วิเคราะห์" line uses the real
                    score from gameResult via GAME_ID_TO_AXIS, not templated
                    filler — null when the candidate hasn't played that
                    game (there's no per-game GameResult row, only the 6
                    synthesized axes, so "played" here means the row exists
                    at all). */}
                <div className="flex flex-col gap-2.5">
                  <div>
                    <h4 className="text-xs font-extrabold text-[#0F0F0F]">ผลจากแบบทดสอบที่ 1 — มินิเกม Neuroscience</h4>
                    <p className="mt-0.5 text-[11px] text-[#8A8A8A]">เกมไหนวัดแกนใด และคะแนนที่คุณได้</p>
                  </div>
                  {GAME_STAGES.map((game) => {
                    const GameIcon = GAME_ICONS[game.iconKey];
                    const axis = GAME_ID_TO_AXIS[game.id];
                    const score = gameResult ? gameResult[axis] : null;
                    const isExpanded = expandedGameId === game.id;
                    return (
                      <div key={game.id} className="overflow-hidden rounded-xl bg-white">
                        <button
                          type="button"
                          onClick={() => setExpandedGameId(isExpanded ? null : game.id)}
                          className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#F5F5F5]">
                              <GameIcon className="h-3.5 w-3.5 text-[#0F0F0F]" strokeWidth={2} />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-xs font-bold text-[#0F0F0F]">{game.title}</div>
                              <div className="truncate text-[10px] text-[#8A8A8A]">{game.subtitle}</div>
                            </div>
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-2">
                            {score !== null && (
                              <>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap ${
                                    tierLabel(score) === "จุดแข็ง"
                                      ? "bg-[rgba(59,245,92,0.15)] text-[#0f5c22]"
                                      : tierLabel(score) === "ตามเกณฑ์"
                                        ? "bg-[rgba(77,124,255,0.12)] text-[#4D7CFF]"
                                        : "bg-[rgba(255,110,92,0.12)] text-[#d63d28]"
                                  }`}
                                >
                                  {tierLabel(score)}
                                </span>
                                <span className="text-xs font-extrabold text-[#0F0F0F]">{score}%</span>
                              </>
                            )}
                            <ChevronDown
                              className={`h-3.5 w-3.5 text-[#8A8A8A] transition-transform ${isExpanded ? "rotate-180" : ""}`}
                              strokeWidth={2}
                            />
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-[rgba(15,15,15,0.06)] px-4 py-3">
                            {score === null ? (
                              <p className="text-[11px] leading-[1.7] text-[#8A8A8A]">
                                ยังไม่ได้เล่นเกมนี้ —{" "}
                                <Link href="/play" className="font-bold text-[#4D7CFF] underline">
                                  ไปเล่นมินิเกม
                                </Link>
                              </p>
                            ) : (
                              <div className="flex flex-col gap-2.5">
                                <div>
                                  <div className="text-[10px] font-bold text-[#8A8A8A]">วิเคราะห์จากพฤติกรรมการเล่น</div>
                                  <p className="mt-0.5 text-xs leading-[1.7] text-[#4A4A4A]">
                                    คุณทำ {SOFT_SKILL_AXIS_META[axis].th} ได้ {score}% ({tierLabel(score)}) จากการเล่น{" "}
                                    {game.title}
                                  </p>
                                </div>
                                <div>
                                  <div className="text-[10px] font-bold text-[#8A8A8A]">คำแนะนำ</div>
                                  <p className="mt-0.5 text-xs leading-[1.7] text-[#4A4A4A]">
                                    {score >= 65 ? AXIS_ADVICE[axis].high : AXIS_ADVICE[axis].low}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* "ผลจากแบบทดสอบที่ 2" — Verified box is computed live
                    from chatVerifications (no AI needed); the gap/next-steps
                    boxes are a real Gemini comparison of resumeRawText
                    against gameResult (see generateResumeGapAnalysis) —
                    generated on demand, not auto-run on every page view,
                    since it's a live API call with a real cost. */}
                <div className="flex flex-col gap-3">
                  <div>
                    <h4 className="text-xs font-extrabold text-[#0F0F0F]">
                      ผลจากแบบทดสอบที่ 2 — เรซูเม่และบทสนทนากับน้องตรงปก
                    </h4>
                    <p className="mt-0.5 text-[11px] text-[#8A8A8A]">
                      ทักษะที่สกัดได้มาจากไหน และทำไมบางรายการยังเป็น Partial
                    </p>
                  </div>

                  {verifiedSkillNames.length > 0 && (
                    <div className="rounded-xl bg-white p-4">
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className="rounded-full bg-[rgba(59,245,92,0.15)] px-2 py-0.5 text-[10px] font-bold text-[#0f5c22]">
                          Verified
                        </span>
                        <span className="text-[10px] text-[#8A8A8A]">{verifiedSkillNames.length} รายการ</span>
                      </div>
                      <div className="text-xs font-extrabold text-[#0F0F0F]">ทักษะที่ยืนยันได้จากเอกสาร</div>
                      <p className="mt-1 text-xs leading-[1.7] text-[#4A4A4A]">
                        ยืนยันแล้วจากเรซูเม่: {verifiedSkillNames.join(", ")}
                      </p>
                    </div>
                  )}

                  {gapAnalysis ? (
                    <>
                      <div className="rounded-xl bg-white p-4">
                        <div className="mb-1 text-xs font-extrabold text-[#0F0F0F]">ยังขาดอยู่</div>
                        <div className="text-xs font-bold text-[#d63d28]">{gapAnalysis.missingTitle}</div>
                        <p className="mt-1 text-xs leading-[1.7] text-[#4A4A4A]">{gapAnalysis.missingDetail}</p>
                      </div>
                      <div className="rounded-xl bg-white p-4">
                        <div className="mb-2 text-xs font-extrabold text-[#0F0F0F]">ทำต่อ 3 ข้อ</div>
                        <ul className="flex flex-col gap-1.5">
                          {gapAnalysis.nextSteps.map((step, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs leading-[1.6] text-[#4A4A4A]">
                              <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[#F0F0F0] text-[9px] font-bold text-[#0F0F0F]">
                                {i + 1}
                              </span>
                              {step}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[rgba(15,15,15,0.15)] p-4 text-center">
                      {gapAnalysisError && (
                        <p className="mb-2 text-[11px] font-bold text-red-600">{gapAnalysisError}</p>
                      )}
                      <p className="mb-2.5 text-[11px] text-[#8A8A8A]">
                        ยังไม่มีการวิเคราะห์เชิงลึก — ให้น้องตรงปกเทียบเรซูเม่กับผลเกมของคุณ
                      </p>
                      <button
                        type="button"
                        onClick={handleGenerateGapAnalysis}
                        disabled={isGeneratingGapAnalysis}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#0F0F0F] px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                      >
                        {isGeneratingGapAnalysis && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />}
                        {isGeneratingGapAnalysis ? "กำลังวิเคราะห์..." : "วิเคราะห์ให้หน่อย"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: คอร์สเรียนที่แนะนำ — a real skill-gap analysis against
                the candidate's own top job matches (see skillGapCourses
                above), not a static list tied to mock soft-skill scores.
                Each card names the actual missing skill and exactly
                which/how many real matched jobs need it. */}
            {activeTab === "courses" && (
              <div className="rounded-2xl bg-[#FAFAFA] p-6">
                <div className="mb-4">
                  <h3 className="flex items-center gap-1.5 text-base font-extrabold text-[#0F0F0F]">
                    <GraduationCap className="h-4 w-4 text-[#4D7CFF]" strokeWidth={2} />
                    ทักษะที่ควรพัฒนาเพิ่มเพื่อเพิ่มโอกาสแมตช์
                  </h3>
                  <p className="mt-1 text-xs text-[#5C5C5C]">
                    คำนวณจากทักษะที่ตำแหน่งงานที่แมตช์กับคุณต้องการ แต่คุณยังไม่มีในโปรไฟล์
                  </p>
                </div>

                {skillGapCourses.length === 0 ? (
                  <p className="text-xs leading-[1.7] text-[#8A8A8A]">
                    {recommendedJobs.length === 0
                      ? "ยังไม่มีตำแหน่งงานที่แมตช์ให้วิเคราะห์ช่องว่างทักษะ เพิ่มทักษะของคุณในกล่อง Hard Skills ก่อน"
                      : "ทักษะของคุณครอบคลุมทุกตำแหน่งที่แมตช์แล้ว ไม่มีช่องว่างที่ต้องพัฒนาเพิ่มตอนนี้"}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {skillGapCourses.map(({ skill, count, jobTitles }) => (
                      <div key={skill} className="flex flex-col justify-between rounded-lg bg-white p-3">
                        <div>
                          <span className="rounded-full bg-[#4D7CFF]/10 px-2 py-0.5 text-[10px] font-bold text-[#4D7CFF]">
                            ต้องการใน {count} ตำแหน่งที่แมตช์
                          </span>
                          <h5 className="mt-1 text-xs font-extrabold text-[#0F0F0F]">
                            พัฒนาทักษะ {skill}
                          </h5>
                          <p className="mt-1 text-[11px] text-[#5C5C5C]">
                            ใช้ในตำแหน่ง {jobTitles.slice(0, 2).join(", ")}
                            {jobTitles.length > 2 ? ` และอีก ${jobTitles.length - 2} ตำแหน่ง` : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: ตำแหน่งงานที่น้องตรงปก แนะนำ */}
            {activeTab === "matching" && (
              <div className="flex flex-col gap-4">
                {recommendedJobs.length === 0 && (
                  <div className="rounded-2xl bg-[#FAFAFA] p-6 text-center">
                    <p className="text-sm font-bold text-[#0F0F0F]">ยังไม่มีตำแหน่งที่แนะนำได้</p>
                    <p className="mx-auto mt-1.5 max-w-[380px] text-xs leading-[1.7] text-[#8A8A8A]">
                      ยังไม่มีทักษะให้เทียบกับตำแหน่งงาน เพิ่มทักษะของคุณในกล่อง Hard Skills ด้านบน แล้วตำแหน่งที่แมตช์จะขึ้นที่นี่ทันที
                    </p>
                  </div>
                )}

                {/* Same list-item language as the HR candidate list (see
                    /company/positions/[id]/candidates): icon left, info
                    middle, match score as a plain bold number + small
                    gray label on the right — not a colored badge, so
                    "Match" reads the same way on both sides of the app.
                    Title links to /job/[id] for full details — this is
                    the JOBS mock catalog (real ids), not a DB Position, so
                    it's the same detail route /job's own board already
                    uses. */}
                {recommendedJobs.map((job) => {
                  const isApplied = appliedJobs.includes(job.title);
                  return (
                    <div
                      key={job.title}
                      className="flex flex-wrap items-center gap-3 sm:gap-4 rounded-2xl bg-[#FAFAFA] p-4 transition-colors hover:bg-[#F0F0F0]"
                    >
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#F0F0F0]">
                        <Briefcase className="h-4 w-4 text-[#8A8A8A]" strokeWidth={2} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <Link href={`/job/${job.id}`} className="text-sm font-extrabold text-[#0F0F0F] hover:underline">
                          {job.title}
                        </Link>
                        <div className="mt-0.5 text-xs text-[#8A8A8A]">
                          {job.company} · {job.salaryNote || `฿${job.salaryMin.toLocaleString()} - ฿${job.salaryMax.toLocaleString()}`}
                        </div>
                        {/* Real reasoning — the actual skills this job shares
                            with the candidate's extracted hard skills, not a
                            generic templated sentence. */}
                        <div className="mt-1 flex items-start gap-1 text-[10px] leading-[1.5] text-[#4D7CFF]">
                          <Lightbulb className="mt-0.5 h-3 w-3 flex-shrink-0" strokeWidth={2} />
                          <span>แมตช์เพราะคุณมีทักษะ {job.matchedSkills.join(", ")}</span>
                        </div>
                      </div>

                      <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                        <div className="text-right">
                          <div className="text-lg font-extrabold text-[#0F0F0F]">{job.matchRate}%</div>
                          <div className="text-[9px] text-[#8A8A8A]">Match</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/job/${job.id}`}
                            className="whitespace-nowrap rounded-full bg-white px-3.5 py-1.5 text-[11px] font-bold text-[#0F0F0F] transition-colors hover:bg-[#F0F0F0]"
                          >
                            ดูรายละเอียด
                          </Link>
                          <button
                            type="button"
                            onClick={() => setConfirmApplyJob({ title: job.title, company: job.company })}
                            disabled={isApplied}
                            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-[11px] font-bold transition-all ${
                              isApplied
                                ? "bg-white text-[#8A8A8A] cursor-default"
                                : "bg-[#0F0F0F] text-white hover:opacity-90 active:scale-[0.98]"
                            }`}
                          >
                            {isApplied ? "ยื่นสมัครแล้ว" : "สมัครตำแหน่งนี้"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
      </div>

      {/* Bottom CTA — Next Step in Flow */}
      <div className="mx-auto w-full max-w-[1400px] px-3 sm:px-[clamp(20px,4vw,56px)] pb-[clamp(48px,7vw,80px)]">
        <div className="rounded-[28px] bg-[#F5F5F5] p-[clamp(32px,5vw,52px)] text-center">
          <Image
            src="/mascot/mascot-ai-summary.png"
            alt=""
            width={120}
            height={120}
            className="mx-auto mb-3 h-[88px] w-[88px] object-contain"
          />
          <div className="mb-2 text-xs font-bold tracking-[0.06em] text-[#8A8A8A] uppercase">ขั้นตอนถัดไป</div>
          <h2 className="mb-2 text-[clamp(20px,2.8vw,28px)] font-extrabold tracking-[-0.02em]">
            {hasResume ? "อัปเกรด Resume ของคุณ" : "สร้าง Resume เพื่อยื่นสมัครงาน"}
          </h2>
          <p className="mx-auto mb-8 max-w-[520px] text-sm leading-[1.7] text-[#5C5C5C]">
            {hasResume
              ? "ให้น้องตรงปกช่วยเขียน Resume ที่มีอยู่ให้เป็นเรื่องราวที่บอกว่าคุณเป็นใคร หรือคุยกับเมนเทอร์เพื่อวางแผนขั้นต่อไป"
              : "ให้น้องตรงปกช่วยรวมข้อมูลตัวตนและทักษะจาก Smart Profile ลงไปด้วย — ได้ Resume ที่บอกว่าคุณเป็นใคร ไม่ใช่แค่ทำอะไรมา หรือคุยกับเมนเทอร์ก่อนถ้ายังไม่แน่ใจ"}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* Real Gemini call (see generateAIResume) — "Premium" is a
                forward-looking badge only, not an actual payment gate,
                since none exists yet for this prototype. Same action for
                both HAS_RESUME states — generateAIResume already upserts,
                so "สร้าง" and "อัปเกรด" are the same call, just relabeled. */}
            <button
              type="button"
              onClick={handleGenerateAIResume}
              className="relative inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#0F0F0F] px-7 py-4 text-[14px] font-extrabold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            >
              <Sparkle className="h-3.5 w-3.5" strokeWidth={2} />
              {hasResume ? "ให้น้องตรงปกอัปเกรดเรซูเม่นี้" : "ให้น้องตรงปกช่วยสร้าง"}
              <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold tracking-wide">Premium</span>
            </button>
            {/* "สร้างแบบทั่วไป" (manual /decoder/manual entry) used to live
                here — still reachable from /decoder's own upload-or-fill
                gate, so dropping it from this CTA doesn't orphan that
                route. "คุยกับเมนเทอร์" is now the second button
                unconditionally, not just once a resume already exists. */}
            <Link
              href="/mentor"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-7 py-[15px] text-[14px] font-bold text-[#0F0F0F] transition-all hover:bg-[#0F0F0F] hover:text-white active:scale-[0.98]"
            >
              <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} />
              คุยกับเมนเทอร์
            </Link>
          </div>
          <button
            type="button"
            onClick={handleConfirmProfileAndGoToJobs}
            className="mt-4 cursor-pointer text-[12px] font-semibold text-[#AAAAAA] underline-offset-2 hover:text-[#5C5C5C] hover:underline transition-colors"
          >
            ข้ามไปดู Job Board ก่อน →
          </button>
        </div>
      </div>

      <Footer />

      {/* Adjust-photo modal — opens right after picking a new file so the
          candidate can crop/zoom before it becomes their avatar, instead
          of the raw upload being used as-is. */}
      {cropSrc && cropImgSize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-[460px] rounded-[24px] bg-white p-5 sm:p-6">
            <h3 className="text-base font-extrabold text-[#0F0F0F]">ปรับตำแหน่งรูปโปรไฟล์</h3>
            <p className="mt-1 mb-4 text-xs text-[#8A8A8A]">ลากรูปเพื่อเลื่อน และใช้แถบด้านล่างเพื่อซูม</p>

            <div
              className="relative mx-auto touch-none select-none overflow-hidden rounded-2xl bg-[#F5F5F5]"
              style={{ width: cropViewportSize, height: cropViewportSize, cursor: "grab" }}
              onPointerDown={handleCropPointerDown}
              onPointerMove={handleCropPointerMove}
              onPointerUp={handleCropPointerUp}
              onPointerLeave={handleCropPointerUp}
            >
              {/* Plain <img>, not next/image — position/size are driven
                  frame-by-frame by drag/zoom state, which next/image's
                  fixed-layout model isn't built for. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cropSrc}
                alt=""
                draggable={false}
                className="pointer-events-none absolute"
                style={{
                  // Tailwind's preflight sets `img { max-width: 100%;
                  // height: auto }` — max-width alone was silently
                  // clamping this to the viewport box while height stayed
                  // pixel-exact, squashing non-square photos. Overriding
                  // both here lets the explicit px size actually apply.
                  maxWidth: "none",
                  maxHeight: "none",
                  width: cropImgSize.w * cropScale,
                  height: cropImgSize.h * cropScale,
                  left: cropOffset.x,
                  top: cropOffset.y,
                }}
              />
            </div>

            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={cropZoom}
              onChange={(e) => handleCropZoomChange(Number(e.target.value))}
              className="mt-4 w-full accent-[#0F0F0F]"
              aria-label="ซูมรูปโปรไฟล์"
            />

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={closeCropModal}
                className="flex-1 cursor-pointer rounded-full border-[1.5px] border-[#0F0F0F] bg-white py-2.5 text-sm font-bold text-[#0F0F0F]"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmCrop}
                className="flex-1 cursor-pointer rounded-full bg-[#0F0F0F] py-2.5 text-sm font-bold text-white"
              >
                ใช้รูปนี้
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm-apply modal — error prevention: applying has no undo
          affordance on this page, so a single misclick on the small
          "สมัครตำแหน่งนี้" button shouldn't be able to submit it. */}
      {confirmApplyJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-[440px] rounded-[28px] bg-white p-6 sm:p-7 text-center">
            <Image
              src="/mascot/mascot-job-apply-success.png"
              alt=""
              width={200}
              height={200}
              className="mx-auto h-[104px] w-[104px] object-contain"
            />
            <h3 className="mt-3 text-lg font-extrabold text-[#0F0F0F]">ยืนยันการสมัครงาน</h3>
            <p className="mt-1.5 text-sm leading-[1.6] text-[#5C5C5C]">
              สมัครตำแหน่ง <span className="font-bold text-[#0F0F0F]">{confirmApplyJob.title}</span> ที่{" "}
              {confirmApplyJob.company} ใช่ไหม?
            </p>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmApplyJob(null)}
                className="flex-1 cursor-pointer rounded-full border-[1.5px] border-[#0F0F0F] bg-white py-2.5 text-sm font-bold text-[#0F0F0F]"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmApply}
                className="flex-1 cursor-pointer rounded-full bg-[#0F0F0F] py-2.5 text-sm font-bold text-white"
              >
                ยืนยันสมัคร
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI resume-generation modal — opens immediately on click (showing
          a loading state) rather than waiting for the request to resolve
          first, so the button click always gives instant feedback. */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-[480px] rounded-[28px] bg-white p-6 sm:p-7">
            <div className="flex items-start gap-3">
              <Image
                src="/mascot/mascot-ai-summary.png"
                alt=""
                width={80}
                height={80}
                className="h-14 w-14 flex-shrink-0 object-contain sm:h-16 sm:w-16"
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-extrabold text-[#0F0F0F]">น้องตรงปกช่วยสร้าง Resume</h3>
                {isGeneratingResume ? (
                  <p className="mt-2 flex items-center gap-2 text-xs text-[#8A8A8A]">
                    <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin" strokeWidth={2} />
                    กำลังประมวลผลข้อมูลโปรไฟล์ของคุณ...
                  </p>
                ) : aiResumeError ? (
                  <p className="mt-2 text-xs font-bold text-red-600">{aiResumeError}</p>
                ) : (
                  <p className="mt-2 text-xs leading-relaxed whitespace-pre-wrap text-[#0F0F0F]">{aiResumeResult}</p>
                )}
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="cursor-pointer rounded-full bg-[#0F0F0F] px-5 py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {isResumePreviewOpen && profile?.jobSeekerId && (
        <ResumePreviewModal
          resumeUrl={`/api/resume/${profile.jobSeekerId}?self=true`}
          candidateLabel={candidateName}
          onClose={() => setIsResumePreviewOpen(false)}
        />
      )}
    </div>
  );
}
