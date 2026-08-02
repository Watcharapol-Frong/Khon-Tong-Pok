"use client";

import { useState } from "react";
import Link from "next/link";
import { AssessmentStepBar } from "@/components/AssessmentStepBar";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

const ROLE_GROUPS = [
  {
    id: "student",
    title: "นักศึกษา / เด็กจบใหม่",
    desc: "เพิ่งจบการศึกษา หรือกำลังศึกษาอยู่ ไม่มีประสบการณ์ทำงานประจำ เน้นวัดศักยภาพและ Soft Skills แฝง",
    icon: "🎓",
    badgeColor: "#3BF55C",
  },
  {
    id: "early_career",
    title: "Early Career (ประสบการณ์ 1 - 3 ปี)",
    desc: "เริ่มทำงานแล้ว กำลังค้นหาตำแหน่งงานที่ตอบโจทย์ตัวตนจริงและความก้าวหน้าในสายอาชีพ",
    icon: "🚀",
    badgeColor: "#4D7CFF",
  },
  {
    id: "career_switcher",
    title: "Career Switcher (ย้ายสายงาน)",
    desc: "ต้องการเปลี่ยนสายงานใหม่ โดยใช้ทักษะที่ถ่ายทอดได้ (Transferable Skills) และการเรียนรู้ไวเป็นหลัก",
    icon: "🔄",
    badgeColor: "#FF6E5C",
  },
  {
    id: "upskiller",
    title: "Upskiller (พัฒนาทักษะเพิ่มเติม)",
    desc: "มีประสบการณ์สูง ต้องการประเมินศักยภาพรอบด้านและอัปเดตโปรไฟล์ทักษะยุคใหม่",
    icon: "📈",
    badgeColor: "#F5D949",
  },
];

export default function OnboardingPage() {
  const [selectedRole, setSelectedRole] = useState("student");

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
      <Navbar />
      <AssessmentStepBar currentStep={1} />

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-8 sm:px-6 md:px-8">
        {/* Background Grid Pattern */}
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

        <div className="relative w-full max-w-[780px]">
          {/* Card Container */}
          <div className="relative rounded-[28px] border border-[rgba(15,15,15,0.1)] bg-[#FAFAFA] p-[clamp(24px,5vw,44px)] shadow-[0_20px_50px_rgba(15,15,15,0.05)]">
            <div className="absolute -top-3 -left-3 -z-10 h-12 w-12 rounded-2xl bg-[#3BF55C]" />

            {/* Header */}
            <div className="mb-8 text-center">
              <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-[rgba(15,15,15,0.08)] bg-white px-3.5 py-1 text-xs font-bold text-[#5C5C5C]">
                <span className="h-2 w-2 rounded-full bg-[#3BF55C]" />
                Role Selection (สถานะปัจจุบันของคุณ)
              </div>
              <h1 className="text-[clamp(24px,4vw,32px)] font-extrabold tracking-[-0.03em]">
                เลือกสถานะผู้สมัครของคุณ
              </h1>
              <p className="mx-auto mt-2 max-w-[700px] text-xs leading-[1.6] text-[#8A8A8A]">
                เลือกระดับกลุ่มเป้าหมายเพื่อปรับโทนคำถามและบริบทในด่านมินิเกมให้เหมาะสมกับตัวตนของคุณมากที่สุด
              </p>
            </div>

            {/* Role Selection Grid */}
            <div className="mb-8">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {ROLE_GROUPS.map((group) => {
                  const active = selectedRole === group.id;
                  return (
                    <div
                      key={group.id}
                      onClick={() => setSelectedRole(group.id)}
                      className={`relative flex cursor-pointer flex-col rounded-2xl border p-4.5 transition-all ${
                        active
                          ? "border-[#0F0F0F] bg-white shadow-md ring-2 ring-[#0F0F0F]"
                          : "border-[rgba(15,15,15,0.1)] bg-white opacity-75 hover:border-[rgba(15,15,15,0.3)] hover:opacity-100"
                      }`}
                    >
                      <div className="mb-2.5 flex items-center justify-between">
                        <span className="text-2xl">{group.icon}</span>
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ background: group.badgeColor }}
                        />
                      </div>
                      <div className="text-sm font-extrabold text-[#0F0F0F]">{group.title}</div>
                      <p className="mt-1 text-[11px] leading-[1.5] text-[#5C5C5C]">{group.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <Link
                href="/play"
                className="flex w-full cursor-pointer items-center justify-center rounded-full bg-[#0F0F0F] py-4 text-xs font-extrabold text-white transition-all hover:opacity-90 active:scale-[0.99]"
              >
                เริ่มเล่นมินิเกม
              </Link>
              <div className="text-center text-[11px] text-[#8A8A8A]">
                ⏱ ไม่ต้องเตรียมเรซูเม่ล่วงหน้า · เล่นจบปลดล็อก Dynamic Profile และตำแหน่งงานแมตช์ทันที
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
