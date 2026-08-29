"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Calendar, Check, ChevronLeft, ChevronRight, Plus, Sparkle, Trash2 } from "lucide-react";
import { Footer } from "@/components/Footer";
import { JobSeekerAuthGuard } from "@/components/JobSeekerAuthGuard";
import { Navbar } from "@/components/Navbar";
import { SkillAutocomplete } from "@/components/SkillAutocomplete";
import {
  getJobSeekerProfile,
  saveProfileEducation,
  saveProfileSkills,
  saveProfileStep1,
  saveProfileWorkExperience,
  type EducationInput,
  type LanguageSkillInput,
  type ProfileStep1Input,
  type WorkExperienceInput,
} from "@/lib/actions/jobSeeker";
import { useJobSeekerSession } from "@/lib/jobSeekerSessionContext";
import onetSkills from "@/data/onet_skills_dictionary_full.json";

const STEPS = [
  { key: "personal", label: "ข้อมูลส่วนตัว" },
  { key: "education", label: "การศึกษา" },
  { key: "experience", label: "ประสบการณ์" },
  { key: "skills", label: "ทักษะ" },
] as const;
type StepKey = (typeof STEPS)[number]["key"];

const GENDER_OPTIONS = ["ชาย", "หญิง", "ไม่ระบุ"];
const MARITAL_OPTIONS = ["โสด", "สมรส", "หย่าร้าง/หม้าย"];
const MILITARY_OPTIONS = ["ผ่านการเกณฑ์ทหารแล้ว", "ได้รับการยกเว้น", "ยังไม่ผ่านการเกณฑ์ทหาร", "ไม่เกี่ยวข้อง"];
const JOB_TYPE_OPTIONS = ["งานประจำ", "งานพาร์ทไทม์", "ฟรีแลนซ์", "ฝึกงาน"];
const EDUCATION_LEVELS = ["มัธยมศึกษา", "ปวช.", "ปวส.", "ปริญญาตรี", "ปริญญาโท", "ปริญญาเอก"];
const LANGUAGE_LEVELS = ["ดีมาก", "ดี", "พอใช้", "เล็กน้อย"];

// All 77 provinces — ProvinceInput below lets these fields stay free-typeable
// while offering the full list to pick from, rather than forcing either a
// free-text-only or select-only field. A native <input list>/<datalist> did
// this too, but its popup is unstyleable browser chrome (inconsistent
// sizing versus sibling inputs, no way to match the page's own theme).
const THAI_PROVINCES = [
  "กรุงเทพมหานคร", "กระบี่", "กาญจนบุรี", "กาฬสินธุ์", "กำแพงเพชร", "ขอนแก่น", "จันทบุรี", "ฉะเชิงเทรา",
  "ชลบุรี", "ชัยนาท", "ชัยภูมิ", "ชุมพร", "เชียงราย", "เชียงใหม่", "ตรัง", "ตราด", "ตาก", "นครนายก",
  "นครปฐม", "นครพนม", "นครราชสีมา", "นครศรีธรรมราช", "นครสวรรค์", "นนทบุรี", "นราธิวาส", "น่าน",
  "บึงกาฬ", "บุรีรัมย์", "ปทุมธานี", "ประจวบคีรีขันธ์", "ปราจีนบุรี", "ปัตตานี", "พระนครศรีอยุธยา",
  "พังงา", "พัทลุง", "พิจิตร", "พิษณุโลก", "เพชรบุรี", "เพชรบูรณ์", "แพร่", "พะเยา", "ภูเก็ต",
  "มหาสารคาม", "มุกดาหาร", "แม่ฮ่องสอน", "ยโสธร", "ยะลา", "ร้อยเอ็ด", "ระนอง", "ระยอง", "ราชบุรี",
  "ลพบุรี", "ลำปาง", "ลำพูน", "เลย", "ศรีสะเกษ", "สกลนคร", "สงขลา", "สตูล", "สมุทรปราการ",
  "สมุทรสงคราม", "สมุทรสาคร", "สระแก้ว", "สระบุรี", "สิงห์บุรี", "สุโขทัย", "สุพรรณบุรี", "สุราษฎร์ธานี",
  "สุรินทร์", "หนองคาย", "หนองบัวลำภู", "อ่างทอง", "อำนาจเจริญ", "อุดรธานี", "อุตรดิตถ์", "อุทัยธานี",
  "อุบลราชธานี",
];

function emptyEducation(): EducationInput {
  return { level: "", institution: "", fieldOfStudy: "", gpa: undefined, startYear: undefined, endYear: undefined };
}
function emptyWorkExperience(): WorkExperienceInput {
  return { companyName: "", jobTitle: "", responsibilities: "", salary: undefined, startDate: "", endDate: "", isCurrent: false };
}
function emptyLanguage(): LanguageSkillInput {
  return { language: "", speaking: "", reading: "", writing: "" };
}

/** DB stores Date|null; <input type="date"> needs a "YYYY-MM-DD" string. */
function toDateInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

// h-[38px] pins every field to the same box regardless of element type —
// <select> renders ~5px taller than <input> by default even with identical
// padding/border classes (native dropdown-arrow chrome), so without a fixed
// height, fields sitting side by side in the same grid row visibly mismatch.
const inputClass =
  "h-[38px] w-full rounded-xl border border-[rgba(15,15,15,0.12)] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#0F0F0F] outline-none transition-border focus:border-[#0F0F0F]";
// Same base styling, but without the fixed single-line height — the one
// multi-line field (work responsibilities) needs to actually grow with rows.
const textareaClass = inputClass.replace("h-[38px] ", "");
const labelClass = "mb-1.5 block text-xs font-bold text-[#0F0F0F]";

/**
 * Free-type-or-pick-from-77-provinces field — same inputClass as every
 * sibling field (so its box is identical, unlike the native <input
 * list>/<datalist> it replaces) and the same dropdown-panel styling as
 * SkillAutocomplete (src/components/SkillAutocomplete.tsx) so it reads as
 * this page's own theme instead of unstyleable browser chrome.
 */
function ProvinceInput({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [isOpen]);

  const trimmed = value.trim().toLowerCase();
  const matches = trimmed ? THAI_PROVINCES.filter((p) => p.toLowerCase().includes(trimmed)).slice(0, 8) : [];

  return (
    <div className="relative" ref={rootRef}>
      <input
        className={inputClass}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
      />
      {isOpen && trimmed && (
        <div className="absolute top-[calc(100%+4px)] right-0 left-0 z-40 max-h-[240px] overflow-y-auto rounded-[10px] border border-[rgba(15,15,15,0.12)] bg-white p-1.5 shadow-[0_8px_20px_rgba(15,15,15,0.12)]">
          {matches.length === 0 ? (
            <div className="px-2 py-2 text-[11px] text-[#8A8A8A]">ไม่พบจังหวัดที่ตรงกับคำค้นหา</div>
          ) : (
            matches.map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => {
                  onChange(p);
                  setIsOpen(false);
                }}
                className="block w-full cursor-pointer rounded-lg px-2 py-2 text-left text-xs hover:bg-[#F5F5F5]"
              >
                {p}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];
const THAI_DAY_LABELS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function formatDateDisplay(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${d} ${THAI_MONTHS_SHORT[m - 1]} ${y + 543}`;
}

/**
 * Replaces native <input type="date"> — its calendar popup is unstyleable
 * browser chrome (the exact same problem ProvinceInput above solved for
 * <input list>/<datalist>). Trigger reuses inputClass so its box matches
 * every sibling field; panel reuses SkillAutocomplete's dropdown styling.
 * Value/onChange stay plain ISO "YYYY-MM-DD" strings so this drops straight
 * into the existing ProfileStep1Input/WorkExperienceInput fields. Calendar
 * header shows the Buddhist-era year (+543) since that's the convention
 * Thai users expect, even though the stored/wire value stays Gregorian.
 * openUpward is for fields sitting right above the step's submit button —
 * opening downward there lands the panel beside the button instead of over
 * empty space, reading as a stray fragment rather than a floating overlay.
 */
function DateInput({
  value,
  onChange,
  openUpward,
}: {
  value: string;
  onChange: (next: string) => void;
  openUpward?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const today = new Date();
  const [viewYear, setViewYear] = useState(() => (value ? Number(value.slice(0, 4)) : today.getFullYear()));
  const [viewMonth, setViewMonth] = useState(() => (value ? Number(value.slice(5, 7)) - 1 : today.getMonth()));
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [isOpen]);

  const openPicker = () => {
    if (value) {
      setViewYear(Number(value.slice(0, 4)));
      setViewMonth(Number(value.slice(5, 7)) - 1);
    }
    setIsOpen(true);
  };

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };
  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const leadingBlanks = Array.from({ length: firstWeekday }, (_, i) => i);

  const selectDay = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange(`${viewYear}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const isSelected = (day: number) =>
    value === `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : openPicker())}
        className={`${inputClass} flex items-center justify-between text-left`}
      >
        <span className={value ? "" : "text-[#B5B5B5] font-normal"}>
          {value ? formatDateDisplay(value) : "เลือกวันที่"}
        </span>
        <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-[#8A8A8A]" strokeWidth={2} />
      </button>
      {isOpen && (
        <div
          className={`absolute left-0 z-40 w-[264px] rounded-[10px] border border-[rgba(15,15,15,0.12)] bg-white p-3 shadow-[0_8px_20px_rgba(15,15,15,0.12)] ${
            openUpward ? "bottom-[calc(100%+4px)]" : "top-[calc(100%+4px)]"
          }`}
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={goPrevMonth}
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg hover:bg-[#F5F5F5]"
            >
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
            <span className="text-xs font-extrabold text-[#0F0F0F]">
              {THAI_MONTHS_SHORT[viewMonth]} {viewYear + 543}
            </span>
            <button
              type="button"
              onClick={goNextMonth}
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg hover:bg-[#F5F5F5]"
            >
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#B5B5B5]">
            {THAI_DAY_LABELS.map((d, i) => (
              <div key={i}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {leadingBlanks.map((b) => (
              <div key={`b${b}`} />
            ))}
            {days.map((day) => (
              <button
                type="button"
                key={day}
                onClick={() => selectDay(day)}
                className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-[11px] font-semibold transition-colors ${
                  isSelected(day) ? "bg-[#0F0F0F] text-white" : "text-[#0F0F0F] hover:bg-[#F5F5F5]"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Same card shell as AuthCard (login/register) — this multi-step form is
// part of the same candidate flow. Sparkle positions/opacity and the
// candidate-green accent square copied from AuthCard's own CARD_SPARKLES.
const CARD_SPARKLES = [
  { top: "2%", left: "-18px", size: 26, color: "#F5D949", rotate: -18, opacity: 0.65 },
  { top: "10%", right: "-18px", size: 20, color: "#B14DFF", rotate: 15, opacity: 0.6 },
  { bottom: "14%", left: "-20px", size: 18, color: "#4D7CFF", rotate: 20, opacity: 0.6 },
  { bottom: "4%", right: "-14px", size: 22, color: "#FF5CA8", rotate: -12, opacity: 0.6 },
];
const CANDIDATE_ACCENT = "#3BF55C";

export default function DecoderManualPage() {
  return (
    <JobSeekerAuthGuard>
      <DecoderManualContent />
    </JobSeekerAuthGuard>
  );
}

function DecoderManualContent() {
  const router = useRouter();
  const { jobSeeker } = useJobSeekerSession();
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep: StepKey = STEPS[stepIndex].key;
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [step1, setStep1] = useState<ProfileStep1Input>({});
  const [education, setEducation] = useState<EducationInput[]>([emptyEducation()]);
  const [workExperience, setWorkExperience] = useState<WorkExperienceInput[]>([emptyWorkExperience()]);
  const [computerSkills, setComputerSkills] = useState<string[]>([]);
  const [languageSkills, setLanguageSkills] = useState<LanguageSkillInput[]>([emptyLanguage()]);

  // Every step's save action here is replace-all (see saveProfileEducation
  // etc.'s own docstrings) — without this, a returning candidate lands on
  // blank fields and re-submitting silently wipes whatever they already
  // saved (via this form before, or via /decoder's resume upload for
  // computerSkills) instead of just editing it. Runs once on mount only,
  // so it can't clobber anything the candidate has already started typing.
  useEffect(() => {
    let cancelled = false;
    getJobSeekerProfile().then((profile) => {
      if (cancelled || !profile) return;
      setStep1({
        firstNameTh: profile.firstNameTh ?? undefined,
        lastNameTh: profile.lastNameTh ?? undefined,
        firstNameEn: profile.firstNameEn ?? undefined,
        lastNameEn: profile.lastNameEn ?? undefined,
        birthDate: toDateInputValue(profile.birthDate) || undefined,
        gender: profile.gender ?? undefined,
        nationality: profile.nationality ?? undefined,
        religion: profile.religion ?? undefined,
        maritalStatus: profile.maritalStatus ?? undefined,
        address: profile.address ?? undefined,
        province: profile.province ?? undefined,
        postalCode: profile.postalCode ?? undefined,
        phone: profile.phone ?? undefined,
        militaryStatus: profile.militaryStatus ?? undefined,
        desiredPosition: profile.desiredPosition ?? undefined,
        desiredSalaryMin: profile.desiredSalaryMin ?? undefined,
        desiredSalaryMax: profile.desiredSalaryMax ?? undefined,
        desiredJobType: profile.desiredJobType ?? undefined,
        desiredProvince: profile.desiredProvince ?? undefined,
        availableDate: toDateInputValue(profile.availableDate) || undefined,
      });
      if (profile.education.length > 0) {
        setEducation(
          profile.education.map((e) => ({
            level: e.level,
            institution: e.institution,
            fieldOfStudy: e.fieldOfStudy ?? "",
            gpa: e.gpa ?? undefined,
            startYear: e.startYear ?? undefined,
            endYear: e.endYear ?? undefined,
          }))
        );
      }
      if (profile.workExperience.length > 0) {
        setWorkExperience(
          profile.workExperience.map((w) => ({
            companyName: w.companyName,
            jobTitle: w.jobTitle,
            responsibilities: w.responsibilities ?? "",
            salary: w.salary ?? undefined,
            startDate: toDateInputValue(w.startDate),
            endDate: toDateInputValue(w.endDate),
            isCurrent: w.isCurrent,
          }))
        );
      }
      setComputerSkills(profile.computerSkills);
      if (profile.languageSkills.length > 0) {
        setLanguageSkills(
          profile.languageSkills.map((l) => ({
            language: l.language,
            speaking: l.speaking ?? "",
            reading: l.reading ?? "",
            writing: l.writing ?? "",
          }))
        );
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- jobSeeker.id is stable for this page's lifetime (set once by the auth guard)
  }, []);

  const updateStep1 = <K extends keyof ProfileStep1Input>(key: K, value: ProfileStep1Input[K]) =>
    setStep1((f) => ({ ...f, [key]: value }));

  const updateEducationRow = (index: number, patch: Partial<EducationInput>) =>
    setEducation((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const updateWorkRow = (index: number, patch: Partial<WorkExperienceInput>) =>
    setWorkExperience((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const updateLanguageRow = (index: number, patch: Partial<LanguageSkillInput>) =>
    setLanguageSkills((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const goBack = () => {
    setErrorMsg("");
    setStepIndex((i) => Math.max(0, i - 1));
  };

  const goNext = async () => {
    setErrorMsg("");

    if (currentStep === "personal") {
      if (!step1.desiredPosition?.trim()) {
        setErrorMsg("กรุณากรอกตำแหน่งงานที่สนใจ");
        return;
      }
      setIsSubmitting(true);
      const result = await saveProfileStep1(step1);
      setIsSubmitting(false);
      if ("error" in result) {
        setErrorMsg(result.error);
        return;
      }
    } else if (currentStep === "education") {
      const cleaned = education.filter((e) => e.level && e.institution.trim());
      setIsSubmitting(true);
      const result = await saveProfileEducation(cleaned);
      setIsSubmitting(false);
      if ("error" in result) {
        setErrorMsg(result.error);
        return;
      }
    } else if (currentStep === "experience") {
      const cleaned = workExperience.filter((w) => w.companyName.trim() && w.jobTitle.trim());
      setIsSubmitting(true);
      const result = await saveProfileWorkExperience(cleaned);
      setIsSubmitting(false);
      if ("error" in result) {
        setErrorMsg(result.error);
        return;
      }
    }

    setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
  };

  const handleFinalSubmit = async () => {
    setErrorMsg("");
    if (computerSkills.length === 0) {
      setErrorMsg("กรุณาเลือกทักษะคอมพิวเตอร์อย่างน้อย 1 รายการ");
      return;
    }
    setIsSubmitting(true);
    const cleanedLanguages = languageSkills.filter((l) => l.language.trim());
    const result = await saveProfileSkills({ computerSkills, languageSkills: cleanedLanguages });
    setIsSubmitting(false);

    if ("error" in result) {
      setErrorMsg(result.error);
      return;
    }
    router.push("/decoder");
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
      <Navbar />

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12 sm:px-6 md:px-8">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(15,15,15,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(15,15,15,0.04) 1px,transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse 60% 55% at 50% 40%,#000 40%,transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 60% 55% at 50% 40%,#000 40%,transparent 100%)",
          }}
        />

        <div className="relative w-full max-w-[720px]">
          {CARD_SPARKLES.map((s, i) => (
            <Sparkle
              key={i}
              className="pointer-events-none absolute"
              style={{
                top: s.top,
                bottom: s.bottom,
                left: s.left,
                right: s.right,
                opacity: s.opacity,
                transform: `rotate(${s.rotate}deg)`,
              }}
              width={s.size}
              height={s.size}
              fill={s.color}
              color={s.color}
              strokeWidth={1}
            />
          ))}

          <div className="relative rounded-2xl bg-[#F5F5F5] p-[clamp(24px,5vw,40px)]">
            <div
              className="absolute -top-3 -left-3 -z-10 h-12 w-12 rounded-2xl"
              style={{ backgroundColor: CANDIDATE_ACCENT }}
            />

            <button
              type="button"
              onClick={() => router.push("/decoder")}
              className="mb-4 inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-[#8A8A8A] hover:text-[#0F0F0F]"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
              กลับไปหน้าแชท
            </button>

            <div className="mb-5">
              <h1 className="text-[clamp(22px,4vw,28px)] font-extrabold tracking-[-0.03em]">กรอกโปรไฟล์ด้วยตัวเอง</h1>
              <p className="mt-1.5 text-xs text-[#8A8A8A]">
                ไม่มีเรซูเม่ตอนนี้? กรอกข้อมูลเองได้เลยครับคุณ{jobSeeker.name}
              </p>
            </div>

            {/* Step indicator */}
            <div className="mb-6 flex items-center justify-center gap-2">
              {STEPS.map((s, i) => {
                const isDone = i < stepIndex;
                const isCurrent = i === stepIndex;
                return (
                  <div key={s.key} className="flex items-center gap-2">
                    <div
                      className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        isCurrent
                          ? "bg-[#0F0F0F] text-white"
                          : isDone
                            ? "bg-[#4D7CFF] text-white"
                            : "bg-white text-[#8A8A8A]"
                      }`}
                    >
                      {isDone ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                    </div>
                    <span className={`text-[11px] font-bold ${isCurrent ? "text-[#0F0F0F]" : "text-[#8A8A8A]"}`}>
                      {s.label}
                    </span>
                    {i < STEPS.length - 1 && <div className="h-px w-4 flex-shrink-0 bg-[rgba(15,15,15,0.15)] sm:w-6" />}
                  </div>
                );
              })}
            </div>

            {errorMsg && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
                <span>{errorMsg}</span>
              </div>
            )}

            {currentStep === "personal" && (
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="mb-3 text-sm font-extrabold text-[#0F0F0F]">ข้อมูลส่วนบุคคล</h2>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>ชื่อ (ไทย)</label>
                      <input
                        className={inputClass}
                        value={step1.firstNameTh ?? ""}
                        onChange={(e) => updateStep1("firstNameTh", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>นามสกุล (ไทย)</label>
                      <input
                        className={inputClass}
                        value={step1.lastNameTh ?? ""}
                        onChange={(e) => updateStep1("lastNameTh", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>First Name (English)</label>
                      <input
                        className={inputClass}
                        value={step1.firstNameEn ?? ""}
                        onChange={(e) => updateStep1("firstNameEn", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Last Name (English)</label>
                      <input
                        className={inputClass}
                        value={step1.lastNameEn ?? ""}
                        onChange={(e) => updateStep1("lastNameEn", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>วันเกิด</label>
                      <DateInput
                        value={step1.birthDate ?? ""}
                        onChange={(v) => updateStep1("birthDate", v)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>เพศ</label>
                      <select
                        className={inputClass}
                        value={step1.gender ?? ""}
                        onChange={(e) => updateStep1("gender", e.target.value)}
                      >
                        <option value="">เลือก</option>
                        {GENDER_OPTIONS.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>สัญชาติ</label>
                      <input
                        className={inputClass}
                        value={step1.nationality ?? ""}
                        onChange={(e) => updateStep1("nationality", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>ศาสนา</label>
                      <input
                        className={inputClass}
                        value={step1.religion ?? ""}
                        onChange={(e) => updateStep1("religion", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>สถานภาพ</label>
                      <select
                        className={inputClass}
                        value={step1.maritalStatus ?? ""}
                        onChange={(e) => updateStep1("maritalStatus", e.target.value)}
                      >
                        <option value="">เลือก</option>
                        {MARITAL_OPTIONS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>สถานภาพทางทหาร</label>
                      <select
                        className={inputClass}
                        value={step1.militaryStatus ?? ""}
                        onChange={(e) => updateStep1("militaryStatus", e.target.value)}
                      >
                        <option value="">เลือก</option>
                        {MILITARY_OPTIONS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>เบอร์โทรศัพท์</label>
                      <input
                        className={inputClass}
                        value={step1.phone ?? ""}
                        onChange={(e) => updateStep1("phone", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>รหัสไปรษณีย์</label>
                      <input
                        className={inputClass}
                        value={step1.postalCode ?? ""}
                        onChange={(e) => updateStep1("postalCode", e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>ที่อยู่ปัจจุบัน</label>
                      <input
                        className={inputClass}
                        value={step1.address ?? ""}
                        onChange={(e) => updateStep1("address", e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>จังหวัด</label>
                      <ProvinceInput
                        value={step1.province ?? ""}
                        onChange={(v) => updateStep1("province", v)}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-[rgba(15,15,15,0.08)] pt-4">
                  <h2 className="mb-3 text-sm font-extrabold text-[#0F0F0F]">ลักษณะงานที่ต้องการ</h2>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className={labelClass}>
                        ตำแหน่งงานที่สนใจ <span className="text-red-500">*</span>
                      </label>
                      <input
                        className={inputClass}
                        value={step1.desiredPosition ?? ""}
                        onChange={(e) => updateStep1("desiredPosition", e.target.value)}
                        placeholder="เช่น Frontend Developer"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>เงินเดือนที่คาดหวัง (ต่ำสุด) · บาท/เดือน</label>
                      <input
                        type="number"
                        min={0}
                        className={inputClass}
                        value={step1.desiredSalaryMin ?? ""}
                        onChange={(e) => {
                          const n = e.target.value ? Number(e.target.value) : undefined;
                          updateStep1("desiredSalaryMin", n !== undefined ? Math.max(0, n) : undefined);
                        }}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>เงินเดือนที่คาดหวัง (สูงสุด) · บาท/เดือน</label>
                      <input
                        type="number"
                        min={0}
                        className={inputClass}
                        value={step1.desiredSalaryMax ?? ""}
                        onChange={(e) => {
                          const n = e.target.value ? Number(e.target.value) : undefined;
                          updateStep1("desiredSalaryMax", n !== undefined ? Math.max(0, n) : undefined);
                        }}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>ประเภทงาน</label>
                      <select
                        className={inputClass}
                        value={step1.desiredJobType ?? ""}
                        onChange={(e) => updateStep1("desiredJobType", e.target.value)}
                      >
                        <option value="">เลือก</option>
                        {JOB_TYPE_OPTIONS.map((j) => (
                          <option key={j} value={j}>
                            {j}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>จังหวัดที่สนใจทำงาน</label>
                      <ProvinceInput
                        value={step1.desiredProvince ?? ""}
                        onChange={(v) => updateStep1("desiredProvince", v)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>วันที่พร้อมเริ่มงาน</label>
                      <DateInput
                        value={step1.availableDate ?? ""}
                        onChange={(v) => updateStep1("availableDate", v)}
                        openUpward
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === "education" && (
              <div className="flex flex-col gap-3">
                {education.map((row, i) => (
                  <div key={i} className="rounded-2xl bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#0F0F0F]">รายการที่ {i + 1}</span>
                      {education.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setEducation((rows) => rows.filter((_, idx) => idx !== i))}
                          aria-label="ลบรายการนี้"
                          className="cursor-pointer text-[#8A8A8A] hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>ระดับการศึกษา</label>
                        <select
                          className={inputClass}
                          value={row.level}
                          onChange={(e) => updateEducationRow(i, { level: e.target.value })}
                        >
                          <option value="">เลือก</option>
                          {EDUCATION_LEVELS.map((l) => (
                            <option key={l} value={l}>
                              {l}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>สถาบันการศึกษา</label>
                        <input
                          className={inputClass}
                          value={row.institution}
                          onChange={(e) => updateEducationRow(i, { institution: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>สาขาวิชา</label>
                        <input
                          className={inputClass}
                          value={row.fieldOfStudy ?? ""}
                          onChange={(e) => updateEducationRow(i, { fieldOfStudy: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>เกรดเฉลี่ย (GPA)</label>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          max={4}
                          className={inputClass}
                          value={row.gpa ?? ""}
                          onChange={(e) => updateEducationRow(i, { gpa: e.target.value ? Number(e.target.value) : undefined })}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>ปีที่เริ่ม</label>
                        <input
                          type="number"
                          className={inputClass}
                          value={row.startYear ?? ""}
                          onChange={(e) =>
                            updateEducationRow(i, { startYear: e.target.value ? Number(e.target.value) : undefined })
                          }
                        />
                      </div>
                      <div>
                        <label className={labelClass}>ปีที่จบ</label>
                        <input
                          type="number"
                          className={inputClass}
                          value={row.endYear ?? ""}
                          onChange={(e) => updateEducationRow(i, { endYear: e.target.value ? Number(e.target.value) : undefined })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setEducation((rows) => [...rows, emptyEducation()])}
                  className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-[#0F0F0F] transition-colors hover:bg-[#F0F0F0]"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                  เพิ่มประวัติการศึกษา
                </button>
              </div>
            )}

            {currentStep === "experience" && (
              <div className="flex flex-col gap-3">
                {workExperience.map((row, i) => (
                  <div key={i} className="rounded-2xl bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#0F0F0F]">รายการที่ {i + 1}</span>
                      {workExperience.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setWorkExperience((rows) => rows.filter((_, idx) => idx !== i))}
                          aria-label="ลบรายการนี้"
                          className="cursor-pointer text-[#8A8A8A] hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>ชื่อบริษัท</label>
                        <input
                          className={inputClass}
                          value={row.companyName}
                          onChange={(e) => updateWorkRow(i, { companyName: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>ตำแหน่งงาน</label>
                        <input
                          className={inputClass}
                          value={row.jobTitle}
                          onChange={(e) => updateWorkRow(i, { jobTitle: e.target.value })}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass}>หน้าที่ความรับผิดชอบ</label>
                        <textarea
                          rows={2}
                          className={`${textareaClass} resize-none`}
                          value={row.responsibilities ?? ""}
                          onChange={(e) => updateWorkRow(i, { responsibilities: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>เงินเดือน</label>
                        <input
                          type="number"
                          className={inputClass}
                          value={row.salary ?? ""}
                          onChange={(e) => updateWorkRow(i, { salary: e.target.value ? Number(e.target.value) : undefined })}
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-xs font-bold text-[#0F0F0F]">
                          <input
                            type="checkbox"
                            checked={row.isCurrent ?? false}
                            onChange={(e) => updateWorkRow(i, { isCurrent: e.target.checked })}
                            className="h-4 w-4 rounded accent-[#0F0F0F]"
                          />
                          งานปัจจุบัน
                        </label>
                      </div>
                      <div>
                        <label className={labelClass}>เริ่มงาน</label>
                        <DateInput
                          value={row.startDate ?? ""}
                          onChange={(v) => updateWorkRow(i, { startDate: v })}
                        />
                      </div>
                      {!row.isCurrent && (
                        <div>
                          <label className={labelClass}>สิ้นสุดงาน</label>
                          <DateInput
                            value={row.endDate ?? ""}
                            onChange={(v) => updateWorkRow(i, { endDate: v })}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setWorkExperience((rows) => [...rows, emptyWorkExperience()])}
                  className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-[#0F0F0F] transition-colors hover:bg-[#F0F0F0]"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                  เพิ่มประสบการณ์ทำงาน
                </button>
              </div>
            )}

            {currentStep === "skills" && (
              <div className="flex flex-col gap-5">
                <div>
                  <label className={labelClass}>
                    ทักษะคอมพิวเตอร์/โปรแกรม <span className="text-red-500">*</span>
                  </label>
                  <SkillAutocomplete
                    options={onetSkills.hardSkills}
                    selected={computerSkills}
                    onChange={setComputerSkills}
                    placeholder="พิมพ์ค้นหาแล้วเลือกจากรายการ เช่น Python, Excel"
                  />
                </div>

                <div>
                  <label className={labelClass}>ทักษะภาษา</label>
                  <div className="flex flex-col gap-3">
                    {languageSkills.map((row, i) => (
                      <div key={i} className="rounded-2xl bg-white p-3.5">
                        <div className="mb-2.5 flex items-center gap-2">
                          <input
                            className={`${inputClass} flex-1`}
                            placeholder="ภาษา เช่น อังกฤษ"
                            value={row.language}
                            onChange={(e) => updateLanguageRow(i, { language: e.target.value })}
                          />
                          {languageSkills.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setLanguageSkills((rows) => rows.filter((_, idx) => idx !== i))}
                              aria-label="ลบภาษานี้"
                              className="cursor-pointer text-[#8A8A8A] hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="mb-1 block text-[10px] text-[#8A8A8A]">พูด</label>
                            <select
                              className={inputClass}
                              value={row.speaking ?? ""}
                              onChange={(e) => updateLanguageRow(i, { speaking: e.target.value })}
                            >
                              <option value="">-</option>
                              {LANGUAGE_LEVELS.map((l) => (
                                <option key={l} value={l}>
                                  {l}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-[10px] text-[#8A8A8A]">อ่าน</label>
                            <select
                              className={inputClass}
                              value={row.reading ?? ""}
                              onChange={(e) => updateLanguageRow(i, { reading: e.target.value })}
                            >
                              <option value="">-</option>
                              {LANGUAGE_LEVELS.map((l) => (
                                <option key={l} value={l}>
                                  {l}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-[10px] text-[#8A8A8A]">เขียน</label>
                            <select
                              className={inputClass}
                              value={row.writing ?? ""}
                              onChange={(e) => updateLanguageRow(i, { writing: e.target.value })}
                            >
                              <option value="">-</option>
                              {LANGUAGE_LEVELS.map((l) => (
                                <option key={l} value={l}>
                                  {l}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setLanguageSkills((rows) => [...rows, emptyLanguage()])}
                      className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-[#0F0F0F] transition-colors hover:bg-[#F0F0F0]"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                      เพิ่มภาษา
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-2">
              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={goBack}
                  className="cursor-pointer rounded-full bg-white px-5 py-3 text-xs font-bold text-[#5C5C5C] transition-colors hover:bg-[#F0F0F0]"
                >
                  ← ย้อนกลับ
                </button>
              )}
              {currentStep === "skills" ? (
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  className="flex flex-1 cursor-pointer items-center justify-center rounded-full bg-[#0F0F0F] py-3 text-xs font-extrabold text-white transition-opacity hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
                >
                  {isSubmitting ? "กำลังบันทึก..." : "บันทึกและเริ่มคุยกับน้องตรงปก →"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={isSubmitting}
                  className="flex flex-1 cursor-pointer items-center justify-center rounded-full bg-[#0F0F0F] py-3 text-xs font-extrabold text-white transition-opacity hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
                >
                  {isSubmitting ? "กำลังบันทึก..." : "ถัดไป →"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
