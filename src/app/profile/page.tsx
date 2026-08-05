"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AssessmentStepBar } from "@/components/AssessmentStepBar";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { RadarChart } from "@/components/RadarChart";
import { AXIS_CHIPS, JOBS, RADAR_DATA } from "@/lib/data";

export default function ProfilePage() {
  const router = useRouter();
  const [appliedJobs, setAppliedJobs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"feedback" | "matching" | "skills">("feedback");
  const [candidateName, setCandidateName] = useState<string>("กันต์ ธ.");
  const [userSkills, setUserSkills] = useState<string[]>([
    "React.js",
    "TypeScript",
    "Next.js App Router",
    "Tailwind CSS",
    "REST API Integration",
    "Agile Methodology",
    "Git Version Control",
    "UI/UX Prototyping",
  ]);
  const [newSkillInput, setNewSkillInput] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedName = localStorage.getItem("ktp_username");
      if (storedName) {
        setCandidateName(storedName);
      }
    }
  }, []);

  const handleConfirmProfileAndGoToJobs = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ktp_confirmed_skills", JSON.stringify(userSkills));
      localStorage.setItem("ktp_profile_verified", "true");
    }
    router.push("/job");
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillInput.trim()) return;
    if (!userSkills.includes(newSkillInput.trim())) {
      setUserSkills((prev) => [...prev, newSkillInput.trim()]);
    }
    setNewSkillInput("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setUserSkills((prev) => prev.filter((s) => s !== skillToRemove));
  };

  const recommendedJobs = useMemo(() => {
    return JOBS.slice(0, 4).map((job, idx) => ({
      ...job,
      matchRate: 95 - idx * 4,
      transparentReason:
        idx === 0
          ? "💡 แมตช์สูงสุดเพราะคะแนน Learning Agility 75% + มีทักษะ React, TypeScript ตรงสเปคองค์กร"
          : idx === 1
            ? "💡 คะแนน Collaboration Mindset 85% สูงกว่าค่าเฉลี่ยตำแหน่งนี้ 20%"
            : "💡 คะแนน Critical Thinking 80% ตรงตามเกณฑ์ที่ทีมต้องการ",
    }));
  }, []);

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
        <div className="mb-6 sm:mb-8 rounded-[24px] sm:rounded-[28px] border border-[rgba(15,15,15,0.1)] bg-[#FAFAFA] p-4 sm:p-[clamp(24px,4vw,40px)] shadow-[0_12px_32px_rgba(15,15,15,0.04)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex h-12 w-12 sm:h-16 sm:w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-[#0F0F0F] text-xl sm:text-2xl font-extrabold text-white">
                {candidateName.charAt(0) || "ก"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-base sm:text-xl md:text-2xl font-extrabold tracking-[-0.02em] text-[#0F0F0F]">
                    คุณ{candidateName}
                  </h1>
                  <span className="rounded-full bg-[#3BF55C] px-2 py-0.5 text-[9px] sm:text-[10px] font-extrabold text-[#0F0F0F] whitespace-nowrap">
                    ✓ Verified
                  </span>
                </div>
                <div className="mt-0.5 text-[11px] sm:text-xs text-[#5C5C5C] leading-snug">
                  Candidate #KP-9402 · Frontend & Fullstack Developer Candidate
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Core Profile Dashboard: Expanded Grid (500px + 1fr, max-w-[1400px]) */}
        <div className="mb-10 grid grid-cols-1 gap-6 sm:gap-10 lg:grid-cols-[500px_1fr] lg:items-start">
          {/* Left: Dynamic 6-Axis Radar Chart */}
          <div className="flex flex-col justify-between rounded-[24px] sm:rounded-[28px] border border-[rgba(15,15,15,0.1)] bg-[#FAFAFA] p-4 sm:p-7 lg:sticky lg:top-24 overflow-hidden">
            <div>
              <div className="mb-1 text-[11px] sm:text-xs font-bold tracking-[0.04em] text-[#8A8A8A] uppercase">
                Dynamic Smart Profile
              </div>
              <h2 className="text-base sm:text-xl font-extrabold text-[#0F0F0F]">
                กราฟ Soft Skills 6 ด้าน
              </h2>
              <p className="mt-0.5 text-[11px] sm:text-xs text-[#5C5C5C]">
                ประมวลผลจากมินิเกม Neuroscience
              </p>
            </div>

            {/* Responsive Radar Size (Mobile 230px / Desktop 320px) */}
            <div className="my-4 sm:my-6 flex justify-center w-full overflow-hidden">
              <div className="block sm:hidden">
                <RadarChart data={RADAR_DATA} size={230} theme="mono" showLabels animate />
              </div>
              <div className="hidden sm:block">
                <RadarChart data={RADAR_DATA} size={320} theme="mono" showLabels animate />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-2.5 sm:grid-cols-3">
              {AXIS_CHIPS.map((chip) => (
                <div
                  key={chip.en}
                  className="rounded-xl border border-[rgba(15,15,15,0.1)] bg-white p-2 sm:p-3 text-center text-xs"
                >
                  <div className="font-extrabold text-[#0F0F0F]">{chip.value}%</div>
                  <div className="text-[10px] sm:text-[11px] opacity-70 truncate">{chip.th}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: AI Insights, Hard Skill Matrix & Recommended Jobs */}
          <div className="flex flex-col gap-6 min-h-[540px]">
            {/* Dashboard Tabs (Fixed Layout Shift) */}
            <div className="flex border-b border-[rgba(15,15,15,0.1)] overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab("feedback")}
                className={`cursor-pointer pb-3 text-xs font-extrabold transition-all border-b-2 mr-6 whitespace-nowrap ${
                  activeTab === "feedback"
                    ? "border-[#0F0F0F] text-[#0F0F0F]"
                    : "border-transparent text-[#8A8A8A] hover:text-[#0F0F0F]"
                }`}
              >
                📊 รายงานข้อมูลส่วนบุคคล
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("matching")}
                className={`cursor-pointer pb-3 text-xs font-extrabold transition-all border-b-2 mr-6 whitespace-nowrap ${
                  activeTab === "matching"
                    ? "border-[#0F0F0F] text-[#0F0F0F]"
                    : "border-transparent text-[#8A8A8A] hover:text-[#0F0F0F]"
                }`}
              >
                🎯 ตำแหน่งงานที่น้องตรงปก แนะนำ (4)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("skills")}
                className={`cursor-pointer pb-3 text-xs font-extrabold transition-all border-b-2 whitespace-nowrap ${
                  activeTab === "skills"
                    ? "border-[#0F0F0F] text-[#0F0F0F]"
                    : "border-transparent text-[#8A8A8A] hover:text-[#0F0F0F]"
                }`}
              >
                🛠️ ทักษะการทำงานของคุณ
              </button>
            </div>

            {/* TAB 1: รายงานข้อมูลส่วนบุคคล (Feedback & Development Roadmap) */}
            {activeTab === "feedback" && (
              <div className="flex flex-col gap-6 rounded-2xl border border-[rgba(15,15,15,0.1)] bg-white p-6">
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
                    <div className="mb-2 text-xs font-extrabold text-[#0F0F0F]">
                      💪 จุดแข็งที่โดดเด่น (Strengths)
                    </div>
                    <ul className="flex flex-col gap-1.5 text-xs text-[#4A4A4A]">
                      <li>• **Collaboration Mindset (85%)**: ทำงานเป็นทีมได้อย่างราบรื่น</li>
                      <li>• **Critical Thinking (80%)**: แยกแยะข้อมูลสำคัญได้อย่างแม่นยำ</li>
                    </ul>
                  </div>

                  <div className="rounded-xl border border-[rgba(255,110,92,0.3)] bg-[rgba(255,110,92,0.08)] p-4">
                    <div className="mb-2 text-xs font-extrabold text-[#0F0F0F]">
                      🎯 จุดที่สามารถพัฒนาต่อ (Areas for Growth)
                    </div>
                    <ul className="flex flex-col gap-1.5 text-xs text-[#4A4A4A]">
                      <li>• **Risk Tolerance (60%)**: เพิ่มการทดลองเปิดรับโอกาสเสี่ยงใหม่ๆ</li>
                      <li>• พัฒนาการตัดสินใจฉับไวเมื่อข้อมูลไม่ครบถ้วน</li>
                    </ul>
                  </div>
                </div>

                {/* Upskilling & Course Recommendations Section */}
                <div className="mt-2 rounded-xl border border-[rgba(15,15,15,0.08)] bg-[#FAFAFA] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-extrabold text-[#0F0F0F]">
                        🎓 คอร์สเรียนและกิจกรรมแนะนำเพื่อพัฒนาจุดอัพเกรด
                      </h4>
                      <p className="text-[11px] text-[#8A8A8A]">
                        หลักสูตรสั้นและเวิร์กช็อปที่คัดสรรโดยน้องตรงปก เพื่อเสริมทักษะด้านที่อ่อนให้แข็งแกร่งยิ่งขึ้น
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex flex-col justify-between rounded-lg border border-[rgba(15,15,15,0.08)] bg-white p-3">
                      <div>
                        <span className="rounded-full bg-[#FF6E5C]/10 px-2 py-0.5 text-[10px] font-bold text-[#FF6E5C]">
                          พัฒนา Risk Tolerance
                        </span>
                        <h5 className="mt-1 text-xs font-extrabold text-[#0F0F0F]">
                          Strategic Risk Taking & Decision Workshop
                        </h5>
                        <p className="mt-1 text-[11px] text-[#5C5C5C]">
                          เรียนรู้การประเมินและกล้าตัดสินใจในสภาวะเสี่ยงสูงด้วยกรณีศึกษาธุรกิจจริง
                        </p>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-[rgba(15,15,15,0.06)] pt-2 text-[10px] text-[#8A8A8A]">
                        <span>4 ชั่วโมง · ออนไลน์</span>
                        <button
                          type="button"
                          className="font-bold text-[#0F0F0F] hover:underline"
                        >
                          ดูรายละเอียดคอร์ส
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between rounded-lg border border-[rgba(15,15,15,0.08)] bg-white p-3">
                      <div>
                        <span className="rounded-full bg-[#4D7CFF]/10 px-2 py-0.5 text-[10px] font-bold text-[#4D7CFF]">
                          พัฒนา Agility Under Pressure
                        </span>
                        <h5 className="mt-1 text-xs font-extrabold text-[#0F0F0F]">
                          Agile Execution & Rapid Problem Solving
                        </h5>
                        <p className="mt-1 text-[11px] text-[#5C5C5C]">
                          ฝึกฝนเทคนิคปรับตัวและแก้ปัญหาเฉพาะหน้าเมื่อข้อมูลและกติกาเปลี่ยนแปลงฉับพลัน
                        </p>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-[rgba(15,15,15,0.06)] pt-2 text-[10px] text-[#8A8A8A]">
                        <span>6 ชั่วโมง · Interactive</span>
                        <button
                          type="button"
                          className="font-bold text-[#0F0F0F] hover:underline"
                        >
                          ดูรายละเอียดคอร์ส
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ตำแหน่งงานที่น้องตรงปก แนะนำ */}
            {activeTab === "matching" && (
              <div className="flex flex-col gap-4">
                {recommendedJobs.map((job) => {
                  const isApplied = appliedJobs.includes(job.title);
                  return (
                    <div
                      key={job.title}
                      className="flex flex-col justify-between gap-3 rounded-2xl border border-[rgba(15,15,15,0.1)] bg-white p-5 shadow-sm transition-all hover:border-[rgba(15,15,15,0.3)]"
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
                              ? "bg-gray-100 text-gray-500 cursor-default"
                              : "bg-[#0F0F0F] text-white hover:opacity-90 active:scale-[0.98]"
                          }`}
                        >
                          {isApplied ? "✓ ยื่นสมัครแล้ว (กำลังคัดกรอง)" : "สมัครตำแหน่งนี้"}
                        </button>
                      </div>

                      {/* Transparent Reasoning Badge */}
                      <div className="rounded-xl border border-dashed border-[rgba(77,124,255,0.3)] bg-[rgba(77,124,255,0.06)] p-3 text-[11px] leading-[1.5] text-[#0F0F0F]">
                        {job.transparentReason}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 3: ทักษะการทำงานของคุณที่ น้องตรงปก สกัดได้ (Interactive Edit/Add/Delete) */}
            {activeTab === "skills" && (
              <div className="flex flex-col gap-5 rounded-2xl border border-[rgba(15,15,15,0.1)] bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-extrabold text-[#0F0F0F]">
                      ทักษะการทำงานของคุณที่ น้องตรงปก สกัดได้
                    </h3>
                    <p className="mt-1 text-xs text-[#5C5C5C]">
                      ทักษะวิชาชีพเชิงรุกที่ได้รับการยืนยันแล้ว สามารถกดยกเลิก (✕) เพื่อลบ หรือพิมพ์เพิ่มทักษะใหม่ได้ตามต้องการ
                    </p>
                  </div>
                  <span className="rounded-full bg-[#FAFAFA] px-3 py-1 text-xs font-bold text-[#0F0F0F] border border-[rgba(15,15,15,0.08)]">
                    {userSkills.length} ทักษะ
                  </span>
                </div>

                {/* Interactive Skill Chips */}
                <div className="flex flex-wrap gap-2.5">
                  {userSkills.map((skill) => (
                    <div
                      key={skill}
                      className="group inline-flex items-center gap-2 rounded-xl border border-[rgba(15,15,15,0.12)] bg-[#FAFAFA] px-3.5 py-2 text-xs font-bold text-[#0F0F0F] transition-all hover:border-[#0F0F0F]"
                    >
                      <span>✓ {skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-[11px] font-bold text-[#8A8A8A] opacity-60 hover:opacity-100 hover:text-red-500 transition-opacity"
                        title="ลบทักษะนี้"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add New Skill Form Input */}
                <form onSubmit={handleAddSkill} className="mt-2 flex items-center gap-2 max-w-[480px]">
                  <input
                    type="text"
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    placeholder="พิมพ์เพิ่มทักษะวิชาชีพเพิ่มเติม (เช่น Docker, Figma)..."
                    className="min-w-0 flex-1 rounded-xl border border-[rgba(15,15,15,0.12)] bg-white px-3.5 py-2.5 text-xs outline-none focus:border-[#0F0F0F]"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-[#0F0F0F] px-4 py-2.5 text-xs font-bold text-white transition-transform active:scale-[0.98]"
                  >
                    + เพิ่มทักษะ
                  </button>
                </form>
              </div>
            )}
          </div>
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
              className="relative cursor-pointer rounded-full bg-[#0F0F0F] px-7 py-4 text-[14px] font-extrabold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            >
              ✦ ให้น้องตรงปกช่วยสร้าง
              <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold tracking-wide">Premium</span>
            </button>
            <button
              type="button"
              className="cursor-pointer rounded-full border-[1.5px] border-[#0F0F0F] bg-white px-7 py-[15px] text-[14px] font-bold text-[#0F0F0F] transition-all hover:bg-[#0F0F0F] hover:text-white active:scale-[0.98]"
            >
              สร้างแบบทั่วไป
            </button>
            <label className="cursor-pointer rounded-full border-[1.5px] border-[rgba(15,15,15,0.2)] bg-white px-7 py-[15px] text-[14px] font-bold text-[#5C5C5C] transition-all hover:border-[#0F0F0F] hover:text-[#0F0F0F] active:scale-[0.98]">
              📎 อัปโหลด Resume ที่มีอยู่
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
    </div>
  );
}
