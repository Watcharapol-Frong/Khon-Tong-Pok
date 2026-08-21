"use client";

import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Plus } from "lucide-react";
import { Footer } from "@/components/Footer";
import { LoadingMascot } from "@/components/LoadingMascot";
import { Navbar } from "@/components/Navbar";
import onetSkills from "@/data/onet_skills_dictionary_full.json";
import { SOFT_SKILL_AXIS_META, SOFT_SKILL_AXIS_ORDER } from "@/lib/data";
import {
  createPosition,
  getCandidatesForPosition,
  getPositionsSnapshot,
  getSessionSnapshot,
  setPositionOpen,
  subscribeToStore,
  updatePosition,
} from "@/lib/companyStore";
import type { Position, SoftSkillScores } from "@/lib/types";

const getServerSessionSnapshot = () => null;

type PositionFormState = {
  title: string;
  hardSkillsInput: string;
  softSkills: Record<keyof SoftSkillScores, string>;
};

function emptySoftSkillsForm(): Record<keyof SoftSkillScores, string> {
  return Object.fromEntries(SOFT_SKILL_AXIS_ORDER.map((k) => [k, ""])) as Record<
    keyof SoftSkillScores,
    string
  >;
}

const EMPTY_FORM: PositionFormState = {
  title: "",
  hardSkillsInput: "",
  softSkills: emptySoftSkillsForm(),
};

const HARD_SKILLS_BY_LOWER = new Map(onetSkills.hardSkills.map((s) => [s.toLowerCase(), s]));

function normalizeHardSkillsInput(raw: string): { valid: string[]; invalid: string[] } {
  const candidates = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const c of candidates) {
    const canonical = HARD_SKILLS_BY_LOWER.get(c.toLowerCase());
    if (canonical) valid.push(canonical);
    else invalid.push(c);
  }
  return { valid: Array.from(new Set(valid)), invalid };
}

function positionToForm(position: Position): PositionFormState {
  return {
    title: position.title,
    hardSkillsInput: position.requiredHardSkills.join(", "),
    softSkills: Object.fromEntries(
      SOFT_SKILL_AXIS_ORDER.map((k) => [k, position.requiredSoftSkills[k]?.toString() ?? ""])
    ) as Record<keyof SoftSkillScores, string>,
  };
}

function parseSoftSkillInput(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const n = Number(value);
  if (Number.isNaN(n)) return undefined;
  return Math.min(100, Math.max(0, n));
}

function CompanyPositionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useSyncExternalStore(
    subscribeToStore,
    getSessionSnapshot,
    getServerSessionSnapshot
  );

  useEffect(() => {
    if (getSessionSnapshot() === null) {
      router.replace("/company/login");
    }
  }, [router]);

  // searchParams is known at initial render on both server and client (it's
  // part of the request, unlike localStorage), so a lazy useState initializer
  // — not an effect — is the correct way to seed this from the URL.
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(() => searchParams.get("new") === "1");
  const [form, setForm] = useState<PositionFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [invalidSkillsNotice, setInvalidSkillsNotice] = useState<string[]>([]);

  const positions = session ? getPositionsSnapshot(session.company.id) : [];
  const isFormOpen = isCreating || editingPositionId !== null;

  const startCreate = () => {
    setForm(EMPTY_FORM);
    setFormError("");
    setInvalidSkillsNotice([]);
    setEditingPositionId(null);
    setIsCreating(true);
  };

  const startEdit = (position: Position) => {
    setForm(positionToForm(position));
    setFormError("");
    setInvalidSkillsNotice([]);
    setIsCreating(false);
    setEditingPositionId(position.id);
  };

  const cancelForm = () => {
    setIsCreating(false);
    setEditingPositionId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setInvalidSkillsNotice([]);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    if (!form.title.trim()) {
      setFormError("กรุณากรอกชื่อตำแหน่งงาน");
      return;
    }

    const { valid, invalid } = normalizeHardSkillsInput(form.hardSkillsInput);
    setInvalidSkillsNotice(invalid);

    const requiredSoftSkills = Object.fromEntries(
      SOFT_SKILL_AXIS_ORDER.map((k) => [k, parseSoftSkillInput(form.softSkills[k])])
    ) as Position["requiredSoftSkills"];

    if (editingPositionId) {
      updatePosition(editingPositionId, {
        title: form.title.trim(),
        requiredHardSkills: valid,
        requiredSoftSkills,
      });
    } else {
      createPosition({
        companyId: session.company.id,
        title: form.title.trim(),
        requiredHardSkills: valid,
        requiredSoftSkills,
        open: true,
      });
    }

    setIsCreating(false);
    setEditingPositionId(null);
    setForm(EMPTY_FORM);
    setFormError("");
  };

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
        <Navbar />
        <LoadingMascot />
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
      <Navbar />

      <div className="mx-auto w-full max-w-[900px] flex-1 px-4 py-10 sm:px-6 md:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(15,15,15,0.08)] pb-6">
          <div>
            <Link
              href="/company/dashboard"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#8A8A8A] hover:text-[#0F0F0F]"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
              กลับ Dashboard
            </Link>
            <h1 className="mt-1 text-[clamp(20px,3.5vw,26px)] font-extrabold tracking-[-0.02em]">
              จัดการตำแหน่งงาน
            </h1>
          </div>
          {!isFormOpen && (
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#0F0F0F] px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              สร้างตำแหน่งใหม่
            </button>
          )}
        </div>

        {isFormOpen && (
          <form
            onSubmit={handleFormSubmit}
            className="mb-8 rounded-2xl border border-[rgba(15,15,15,0.1)] bg-[#FAFAFA] p-5"
          >
            <h2 className="mb-4 text-sm font-extrabold text-[#0F0F0F]">
              {editingPositionId ? "แก้ไขตำแหน่งงาน" : "สร้างตำแหน่งงานใหม่"}
            </h2>

            {formError && (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
                <span>{formError}</span>
              </div>
            )}

            <div className="mb-3">
              <label className="mb-1.5 block text-xs font-bold text-[#0F0F0F]">
                ชื่อตำแหน่งงาน <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="เช่น Senior Frontend Developer"
                className="w-full rounded-xl border border-[rgba(15,15,15,0.12)] bg-white px-4 py-2.5 text-xs font-semibold text-[#0F0F0F] outline-none focus:border-[#0F0F0F]"
              />
            </div>

            <div className="mb-3">
              <label className="mb-1.5 block text-xs font-bold text-[#0F0F0F]">
                Hard Skills ที่ต้องการ (คั่นด้วย , )
              </label>
              <input
                type="text"
                value={form.hardSkillsInput}
                onChange={(e) => setForm((f) => ({ ...f, hardSkillsInput: e.target.value }))}
                placeholder="เช่น React, TypeScript, Docker"
                className="w-full rounded-xl border border-[rgba(15,15,15,0.12)] bg-white px-4 py-2.5 text-xs font-semibold text-[#0F0F0F] outline-none focus:border-[#0F0F0F]"
              />
              <p className="mt-1 text-[10px] text-[#8A8A8A]">
                ต้องตรงกับชื่อในฐานข้อมูลทักษะ (เช่นเดียวกับที่ resume scanner ใช้) — ระบบจะตัดคำที่ไม่ตรงออกอัตโนมัติ
              </p>
              {invalidSkillsNotice.length > 0 && (
                <p className="mt-1 text-[10px] font-bold text-amber-600">
                  ไม่พบในฐานข้อมูล เลยถูกตัดออก: {invalidSkillsNotice.join(", ")}
                </p>
              )}
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-bold text-[#0F0F0F]">
                Soft Skills ที่ต้องการ (0-100, ไม่บังคับ)
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SOFT_SKILL_AXIS_ORDER.map((key) => (
                  <div key={key}>
                    <label className="mb-1 block text-[10px] text-[#8A8A8A]">
                      {SOFT_SKILL_AXIS_META[key].en}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={form.softSkills[key]}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          softSkills: { ...f.softSkills, [key]: e.target.value },
                        }))
                      }
                      placeholder="-"
                      className="w-full rounded-lg border border-[rgba(15,15,15,0.12)] bg-white px-2.5 py-2 text-xs font-semibold text-[#0F0F0F] outline-none focus:border-[#0F0F0F]"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-full bg-[#0F0F0F] px-5 py-2.5 text-xs font-extrabold text-white transition-opacity hover:opacity-90 active:scale-[0.99]"
              >
                {editingPositionId ? "บันทึกการแก้ไข" : "สร้างตำแหน่งงาน"}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="rounded-full border border-[rgba(15,15,15,0.15)] bg-white px-5 py-2.5 text-xs font-bold text-[#5C5C5C]"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        )}

        <h2 className="mb-3 text-sm font-extrabold text-[#0F0F0F]">
          ตำแหน่งงานทั้งหมด ({positions.length})
        </h2>

        {positions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[rgba(15,15,15,0.15)] p-8 text-center text-xs text-[#8A8A8A]">
            ยังไม่มีตำแหน่งงาน — กด &quot;สร้างตำแหน่งใหม่&quot; เพื่อเริ่มต้น
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {positions.map((position) => {
              const candidateCount = getCandidatesForPosition(position.id).length;
              const softSkillEntries = SOFT_SKILL_AXIS_ORDER.filter(
                (key) => position.requiredSoftSkills[key] !== undefined
              );

              return (
                <div
                  key={position.id}
                  className="rounded-2xl border border-[rgba(15,15,15,0.1)] bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-[#0F0F0F]">
                          {position.title}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            position.open
                              ? "bg-[rgba(59,245,92,0.15)] text-[#0f5c22]"
                              : "bg-[#F0F0F0] text-[#8A8A8A]"
                          }`}
                        >
                          {position.open ? "เปิดรับสมัคร" : "ปิดรับสมัครแล้ว"}
                        </span>
                      </div>

                      {position.requiredHardSkills.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {position.requiredHardSkills.map((skill) => (
                            <span
                              key={skill}
                              className="rounded bg-[#F0F0F0] px-1.5 py-0.5 text-[10px] font-semibold text-[#5A5A5A]"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}

                      {softSkillEntries.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {softSkillEntries.map((key) => (
                            <span
                              key={key}
                              className="rounded bg-[rgba(77,124,255,0.1)] px-1.5 py-0.5 text-[10px] font-semibold text-[#4D7CFF]"
                            >
                              {SOFT_SKILL_AXIS_META[key].en} ≥{position.requiredSoftSkills[key]}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-2 text-[11px] text-[#8A8A8A]">
                        {candidateCount} ผู้สมัคร Match
                      </div>
                    </div>

                    <div className="flex flex-shrink-0 flex-wrap gap-2">
                      <Link
                        href={`/company/positions/${position.id}/candidates`}
                        className="rounded-full border border-[rgba(15,15,15,0.15)] px-3 py-1.5 text-[11px] font-bold text-[#0F0F0F] hover:bg-[#F5F5F5]"
                      >
                        ดูผู้สมัคร
                      </Link>
                      <button
                        type="button"
                        onClick={() => startEdit(position)}
                        className="rounded-full border border-[rgba(15,15,15,0.15)] px-3 py-1.5 text-[11px] font-bold text-[#0F0F0F] hover:bg-[#F5F5F5]"
                      >
                        แก้ไข
                      </button>
                      <button
                        type="button"
                        onClick={() => setPositionOpen(position.id, !position.open)}
                        className="rounded-full border border-[rgba(15,15,15,0.15)] px-3 py-1.5 text-[11px] font-bold text-[#0F0F0F] hover:bg-[#F5F5F5]"
                      >
                        {position.open ? "ปิดรับสมัคร" : "เปิดรับสมัครอีกครั้ง"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default function CompanyPositionsPage() {
  return (
    <Suspense fallback={null}>
      <CompanyPositionsContent />
    </Suspense>
  );
}
