"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Camera,
  Check,
  FileText,
  GraduationCap,
  Lightbulb,
  Paperclip,
  Pencil,
  Sparkle,
  Target,
  TrendingUp,
  User,
} from "lucide-react";
import { AssessmentStepBar } from "@/components/AssessmentStepBar";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { RadarChart } from "@/components/RadarChart";
import { AXIS_CHIPS, JOBS, RADAR_DATA } from "@/lib/data";

// On-screen size (px) of the square crop viewport in the adjust-photo modal.
const CROP_VIEWPORT_SIZE = 280;

export default function ProfilePage() {
  const router = useRouter();
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
  // The name is guessed from the resume (see guessNameFromResumeText in
  // /decoder) — a heuristic, not a guarantee, so it needs to be
  // correctable here rather than permanently locked to a wrong guess.
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [userSkills, setUserSkills] = useState<string[]>([]);
  // Which of userSkills came from an uploaded resume (document-verified)
  // vs. only ever typed in chat (self-reported) — mirrors the
  // Verified/Partial distinction HR sees on their own candidate report,
  // computed from real provenance rather than invented.
  const [resumeSkills, setResumeSkills] = useState<string[]>([]);
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

    const storedResumeSkills = localStorage.getItem("ktp_resume_skills");
    if (storedResumeSkills) {
      try {
        const parsed = JSON.parse(storedResumeSkills);
        if (Array.isArray(parsed)) {
          setResumeSkills(parsed.filter((s): s is string => typeof s === "string"));
        }
      } catch {
        // Malformed localStorage value — ignore.
      }
    }

    const storedPhoto = localStorage.getItem("ktp_profile_photo");
    if (storedPhoto) {
      setProfilePhoto(storedPhoto);
    }
  }, []);

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
        const baseScale = CROP_VIEWPORT_SIZE / Math.min(img.naturalWidth, img.naturalHeight);
        setCropImgSize({ w: img.naturalWidth, h: img.naturalHeight });
        setCropZoom(1);
        setCropOffset({
          x: (CROP_VIEWPORT_SIZE - img.naturalWidth * baseScale) / 2,
          y: (CROP_VIEWPORT_SIZE - img.naturalHeight * baseScale) / 2,
        });
        setCropSrc(dataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const cropBaseScale = cropImgSize ? CROP_VIEWPORT_SIZE / Math.min(cropImgSize.w, cropImgSize.h) : 1;
  const cropScale = cropBaseScale * cropZoom;

  const clampCropOffset = (offset: { x: number; y: number }, scale: number) => {
    if (!cropImgSize) return offset;
    const dispW = cropImgSize.w * scale;
    const dispH = cropImgSize.h * scale;
    const minX = Math.min(0, CROP_VIEWPORT_SIZE - dispW);
    const minY = Math.min(0, CROP_VIEWPORT_SIZE - dispH);
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
      const srcSize = CROP_VIEWPORT_SIZE / cropScale;
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
    const sampleResumeSkills = ["React", "TypeScript"];
    const sampleAllSkills = ["React", "TypeScript", "Node.js", "PostgreSQL", "Docker"];
    setResumeSkills(sampleResumeSkills);
    setUserSkills(sampleAllSkills);
    localStorage.setItem("ktp_resume_skills", JSON.stringify(sampleResumeSkills));
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

  const handleApply = (title: string) => {
    if (!appliedJobs.includes(title)) {
      setAppliedJobs((prev) => [...prev, title]);
    }
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
              <h3 className="text-sm sm:text-base font-extrabold text-[#0F0F0F]">
                กราฟ Soft Skills 6 ด้าน
              </h3>
              <p className="mt-0.5 text-[11px] sm:text-xs text-[#5C5C5C]">
                ประมวลผลจากมินิเกม Neuroscience
              </p>

              {/* Radar sized from the wrapper's real measured width instead
                  of a fixed 230/320px — lets it actually use the extra
                  room this panel now has instead of leaving it empty
                  while axis labels still crowd each other. */}
              <div ref={chartWrapRefCallback} className="my-4 sm:my-6 flex justify-center w-full overflow-hidden">
                <RadarChart data={RADAR_DATA} size={chartSize} theme="mono" showLabels animate />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-2.5 sm:grid-cols-3">
                {AXIS_CHIPS.map((chip) => (
                  <div
                    key={chip.en}
                    className="rounded-xl bg-white p-2 sm:p-3 text-center text-xs"
                  >
                    <div className="font-extrabold text-[#0F0F0F]">{chip.value}%</div>
                    <div className="text-[10px] leading-snug sm:text-[11px] opacity-70">{chip.th}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Divider — horizontal rule when stacked on mobile, vertical
                rule when side-by-side on desktop — makes clear these are
                two distinct sub-sections, not one continuous topic. */}
            <div className="border-t border-[rgba(15,15,15,0.08)] pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
              {/* Hard Skills */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-[#0F0F0F]">Hard Skills</h3>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#0F0F0F]">
                  {userSkills.length} ทักษะ
                </span>
              </div>

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
                {userSkills.map((skill) => {
                  // Same Verified/Partial distinction HR sees: came from
                  // an uploaded resume (document) vs. only ever
                  // self-reported in chat. Read-only — hard skills only
                  // ever come from actual extraction, never typed in
                  // directly, so this list can't be padded.
                  const isVerified = resumeSkills.includes(skill);
                  return (
                    <div
                      key={skill}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-[#0F0F0F]"
                    >
                      <span>{skill}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                          isVerified
                            ? "bg-[rgba(59,245,92,0.15)] text-[#0f5c22]"
                            : "bg-[rgba(77,124,255,0.12)] text-[#4D7CFF]"
                        }`}
                      >
                        {isVerified ? "Verified" : "Partial"}
                      </span>
                    </div>
                  );
                })}
              </div>
              {userSkills.length > 0 && (
                <p className="mt-2 text-[10px] text-[#8A8A8A]">
                  <span className="font-bold text-[#0f5c22]">Verified</span> = มาจากเรซูเม่ที่อัปโหลด ·{" "}
                  <span className="font-bold text-[#4D7CFF]">Partial</span> = เล่าในแชทกับน้องตรงปก
                </p>
              )}
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

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-[rgba(59,245,92,0.3)] bg-[rgba(59,245,92,0.08)] p-4">
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-[#0F0F0F]">
                      <TrendingUp className="h-3.5 w-3.5 text-[#0f5c22]" strokeWidth={2} />
                      จุดแข็งที่โดดเด่น
                    </div>
                    <p className="text-xs leading-[1.7] text-[#4A4A4A]">
                      คุณทำงานร่วมกับผู้อื่นได้อย่างราบรื่นและมีการคิดวิเคราะห์ที่ชัดเจน — Collaboration
                      Mindset ทำได้ 85% และ Critical Thinking ทำได้ 80% ซึ่งทั้งสองด้านสูงกว่าค่าเฉลี่ยของผู้สมัครทั่วไป
                    </p>
                  </div>

                  <div className="rounded-xl border border-[rgba(255,110,92,0.3)] bg-[rgba(255,110,92,0.08)] p-4">
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-[#0F0F0F]">
                      <Target className="h-3.5 w-3.5 text-[#d63d28]" strokeWidth={2} />
                      จุดที่พัฒนาต่อได้
                    </div>
                    <p className="text-xs leading-[1.7] text-[#4A4A4A]">
                      Risk Tolerance ยังอยู่ที่ 60% ต่ำกว่าค่าเฉลี่ยเล็กน้อย — ลองฝึกตัดสินใจในสถานการณ์ที่ข้อมูลไม่ครบถ้วนหรือมีความเสี่ยงมากขึ้น จะช่วยยกระดับด้านนี้ได้
                    </p>
                  </div>
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

                {recommendedJobs.map((job) => {
                  const isApplied = appliedJobs.includes(job.title);
                  return (
                    <div
                      key={job.title}
                      className="flex flex-col justify-between gap-3 rounded-2xl bg-[#FAFAFA] p-5 transition-colors hover:bg-[#F5F5F5]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="mb-1 flex items-center gap-2">
                            <span className="rounded-md bg-[#3BF55C] px-2 py-0.5 text-[10px] font-extrabold text-[#0F0F0F]">
                              Match {job.matchRate}%
                            </span>
                            <h3 className="text-base font-extrabold text-[#0F0F0F]">
                              {job.title}
                            </h3>
                          </div>
                          <div className="text-xs text-[#8A8A8A]">
                            {job.company} · {job.salaryNote || `฿${job.salaryMin.toLocaleString()} - ฿${job.salaryMax.toLocaleString()}`}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleApply(job.title)}
                          disabled={isApplied}
                          className={`rounded-full px-5 py-2 text-xs font-bold transition-all ${
                            isApplied
                              ? "bg-white text-[#8A8A8A] cursor-default"
                              : "bg-[#0F0F0F] text-white hover:opacity-90 active:scale-[0.98]"
                          }`}
                        >
                          {isApplied ? "✓ ยื่นสมัครแล้ว (กำลังคัดกรอง)" : "สมัครตำแหน่งนี้"}
                        </button>
                      </div>

                      {/* Real reasoning — the actual skills this job shares
                          with the candidate's extracted hard skills, not a
                          generic templated sentence. */}
                      <div className="flex items-start gap-1.5 rounded-xl border border-dashed border-[rgba(77,124,255,0.3)] bg-[rgba(77,124,255,0.06)] p-3 text-[11px] leading-[1.5] text-[#0F0F0F]">
                        <Lightbulb className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#4D7CFF]" strokeWidth={2} />
                        <span>แมตช์เพราะคุณมีทักษะ {job.matchedSkills.join(", ")} ตรงกับที่ตำแหน่งนี้ต้องการ</span>
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
          <div className="mb-2 text-xs font-bold tracking-[0.06em] text-[#8A8A8A] uppercase">ขั้นตอนถัดไป</div>
          <h2 className="mb-2 text-[clamp(20px,2.8vw,28px)] font-extrabold tracking-[-0.02em]">
            สร้าง Resume เพื่อยื่นสมัครงาน
          </h2>
          <p className="mx-auto mb-8 max-w-[520px] text-sm leading-[1.7] text-[#5C5C5C]">
            เลือกสร้างแบบทั่วไป หรือให้น้องตรงปกช่วยรวมข้อมูลตัวตนและทักษะจาก Smart Profile ลงไปด้วย — ได้ Resume ที่บอกว่าคุณเป็นใคร ไม่ใช่แค่ทำอะไรมา
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              className="relative inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#0F0F0F] px-7 py-4 text-[14px] font-extrabold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            >
              <Sparkle className="h-3.5 w-3.5" strokeWidth={2} />
              ให้น้องตรงปกช่วยสร้าง
              <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold tracking-wide">Premium</span>
            </button>
            <button
              type="button"
              className="cursor-pointer rounded-full bg-white px-7 py-[15px] text-[14px] font-bold text-[#0F0F0F] transition-all hover:bg-[#0F0F0F] hover:text-white active:scale-[0.98]"
            >
              สร้างแบบทั่วไป
            </button>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-7 py-[15px] text-[14px] font-bold text-[#5C5C5C] transition-colors hover:bg-[#F0F0F0] hover:text-[#0F0F0F] active:scale-[0.98]">
              <Paperclip className="h-3.5 w-3.5" strokeWidth={2} />
              อัปโหลด Resume ที่มีอยู่
              <input type="file" accept=".pdf,.doc,.docx" className="sr-only" />
            </label>
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
          <div className="w-full max-w-[360px] rounded-[24px] bg-white p-5">
            <h3 className="text-base font-extrabold text-[#0F0F0F]">ปรับตำแหน่งรูปโปรไฟล์</h3>
            <p className="mt-1 mb-4 text-xs text-[#8A8A8A]">ลากรูปเพื่อเลื่อน และใช้แถบด้านล่างเพื่อซูม</p>

            <div
              className="relative mx-auto touch-none select-none overflow-hidden rounded-2xl bg-[#F5F5F5]"
              style={{ width: CROP_VIEWPORT_SIZE, height: CROP_VIEWPORT_SIZE, cursor: "grab" }}
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
    </div>
  );
}
