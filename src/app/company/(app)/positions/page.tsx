"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Plus } from "lucide-react";
import onetSkills from "@/data/onet_skills_dictionary_full.json";
import { getMatchCountsByPosition } from "@/lib/actions/interview";
import {
  closePosition,
  createPosition,
  getPositionsByCompany,
  type PositionWithSkills,
  reopenPosition,
  updatePosition,
} from "@/lib/actions/position";
import { SkillAutocomplete } from "@/components/SkillAutocomplete";
import { useCompanySession } from "@/lib/companySession";
import { SOFT_SKILL_AXIS_META, SOFT_SKILL_AXIS_ORDER } from "@/lib/data";
import type { SoftSkillScores } from "@/lib/types";

type PositionFormState = {
  title: string;
  hardSkills: string[];
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
  hardSkills: [],
  softSkills: emptySoftSkillsForm(),
};

function positionToForm(position: PositionWithSkills): PositionFormState {
  return {
    title: position.title,
    hardSkills: position.requiredHardSkills,
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
  const searchParams = useSearchParams();
  const session = useCompanySession();

  // searchParams is known at initial render on both server and client (it's
  // part of the request, unlike localStorage), so a lazy useState initializer
  // — not an effect — is the correct way to seed this from the URL.
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(() => searchParams.get("new") === "1");
  const [form, setForm] = useState<PositionFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [positions, setPositions] = useState<PositionWithSkills[]>([]);
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});
  const [isLoadingPositions, setIsLoadingPositions] = useState(true);
  // Which position's "ปิดรับสมัคร" button is armed for confirmation — only
  // one at a time. Second click on the same position actually closes it;
  // clicking elsewhere or re-fetching disarms it. A real database write
  // now, not a mock toggle, so a single accidental click shouldn't do it.
  const [closeArmedId, setCloseArmedId] = useState<string | null>(null);

  const refreshPositions = async () => {
    const [fresh, freshMatchCounts] = await Promise.all([
      getPositionsByCompany(session.company.id),
      getMatchCountsByPosition(session.company.id),
    ]);
    setPositions(fresh);
    setMatchCounts(freshMatchCounts);
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([getPositionsByCompany(session.company.id), getMatchCountsByPosition(session.company.id)]).then(
      ([fresh, freshMatchCounts]) => {
        if (cancelled) return;
        setPositions(fresh);
        setMatchCounts(freshMatchCounts);
        setIsLoadingPositions(false);
      }
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- session.company.id is stable for the lifetime of this page (set once by the layout)
  }, []);

  const isFormOpen = isCreating || editingPositionId !== null;

  const startCreate = () => {
    setForm(EMPTY_FORM);
    setFormError("");
    setEditingPositionId(null);
    setIsCreating(true);
  };

  const startEdit = (position: PositionWithSkills) => {
    setForm(positionToForm(position));
    setFormError("");
    setIsCreating(false);
    setEditingPositionId(position.id);
  };

  const cancelForm = () => {
    setIsCreating(false);
    setEditingPositionId(null);
    setForm(EMPTY_FORM);
    setFormError("");
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) {
      setFormError("กรุณากรอกชื่อตำแหน่งงาน");
      return;
    }

    const requiredSoftSkills = Object.fromEntries(
      SOFT_SKILL_AXIS_ORDER.map((k) => [k, parseSoftSkillInput(form.softSkills[k])])
    ) as SoftSkillScores;

    setIsSubmitting(true);
    const result = editingPositionId
      ? await updatePosition(editingPositionId, session.company.id, {
          title: form.title.trim(),
          requiredHardSkills: form.hardSkills,
          requiredSoftSkills,
        })
      : await createPosition({
          companyId: session.company.id,
          title: form.title.trim(),
          requiredHardSkills: form.hardSkills,
          requiredSoftSkills,
        });
    setIsSubmitting(false);

    if ("error" in result) {
      setFormError(result.error);
      return;
    }

    await refreshPositions();
    setIsCreating(false);
    setEditingPositionId(null);
    setForm(EMPTY_FORM);
    setFormError("");
  };

  const handleCloseClick = async (position: PositionWithSkills) => {
    if (closeArmedId !== position.id) {
      setCloseArmedId(position.id);
      return;
    }
    setCloseArmedId(null);
    await closePosition(position.id, session.company.id);
    await refreshPositions();
  };

  const handleReopen = async (position: PositionWithSkills) => {
    await reopenPosition(position.id, session.company.id);
    await refreshPositions();
  };

  return (
    <>
      <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 md:px-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/company/dashboard"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#8A8A8A] hover:text-[#0F0F0F]"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
              กลับ Dashboard
            </Link>
            <h1 className="mt-2 text-[clamp(20px,3.5vw,26px)] font-extrabold tracking-[-0.02em]">
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
            className="mb-8 rounded-2xl bg-[#FAFAFA] p-5"
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
                Hard Skills ที่ต้องการ
              </label>
              <SkillAutocomplete
                options={onetSkills.hardSkills}
                selected={form.hardSkills}
                onChange={(next) => setForm((f) => ({ ...f, hardSkills: next }))}
                placeholder="พิมพ์ค้นหาแล้วเลือกจากรายการ เช่น React, TypeScript, Docker"
              />
              <p className="mt-1 text-[10px] text-[#8A8A8A]">
                เลือกได้เฉพาะทักษะที่มีในฐานข้อมูล (เช่นเดียวกับที่ resume scanner ใช้) — พิมพ์ค้นหาแล้วคลิกเลือกจากรายการที่ขึ้นมา
              </p>
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
                disabled={isSubmitting}
                className="rounded-full bg-[#0F0F0F] px-5 py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
              >
                {isSubmitting
                  ? "กำลังบันทึก..."
                  : editingPositionId
                    ? "บันทึกการแก้ไข"
                    : "สร้างตำแหน่งงาน"}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="rounded-full bg-white px-5 py-2.5 text-xs font-bold text-[#0F0F0F] transition-colors hover:bg-[#F0F0F0]"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        )}

        <h2 className="mb-3 text-sm font-extrabold text-[#0F0F0F]">
          ตำแหน่งงานทั้งหมด ({positions.length})
        </h2>

        {isLoadingPositions ? (
          <div className="rounded-2xl border border-dashed border-[rgba(15,15,15,0.15)] p-8 text-center text-xs text-[#8A8A8A]">
            กำลังโหลดตำแหน่งงาน...
          </div>
        ) : positions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[rgba(15,15,15,0.15)] p-8 text-center text-xs text-[#8A8A8A]">
            <Image
              src="/mascot/mascot-start.png"
              alt=""
              width={120}
              height={120}
              className="h-[88px] w-[88px] object-contain"
            />
            ยังไม่มีตำแหน่งงาน — กด &quot;สร้างตำแหน่งใหม่&quot; เพื่อเริ่มต้น
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {positions.map((position) => {
              const isOpen = position.status === "open";
              const candidateCount = matchCounts[position.id] ?? 0;
              const softSkillEntries = SOFT_SKILL_AXIS_ORDER.filter(
                (key) => position.requiredSoftSkills[key] !== undefined
              );
              const isCloseArmed = closeArmedId === position.id;

              return (
                <div
                  key={position.id}
                  className="rounded-2xl bg-[#FAFAFA] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-extrabold text-[#0F0F0F]">
                          {position.title}
                        </span>
                        <span
                          className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap ${
                            isOpen
                              ? "bg-[rgba(59,245,92,0.15)] text-[#0f5c22]"
                              : "bg-[#F0F0F0] text-[#8A8A8A]"
                          }`}
                        >
                          {isOpen ? "เปิดรับสมัคร" : "ปิดรับสมัครแล้ว"}
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
                        className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-[#0F0F0F] transition-colors hover:bg-[#F0F0F0]"
                      >
                        ดูผู้สมัคร
                      </Link>
                      <button
                        type="button"
                        onClick={() => startEdit(position)}
                        className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-[#0F0F0F] transition-colors hover:bg-[#F0F0F0]"
                      >
                        แก้ไข
                      </button>
                      {isOpen ? (
                        <button
                          type="button"
                          onClick={() => handleCloseClick(position)}
                          className={`cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${
                            isCloseArmed
                              ? "bg-[#C0392B] text-white hover:opacity-90"
                              : "bg-white text-[#0F0F0F] hover:bg-[#F0F0F0]"
                          }`}
                        >
                          {isCloseArmed ? "ยืนยันปิดรับสมัคร?" : "ปิดรับสมัคร"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleReopen(position)}
                          className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-[#0F0F0F] transition-colors hover:bg-[#F0F0F0]"
                        >
                          เปิดรับสมัครอีกครั้ง
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

export default function CompanyPositionsPage() {
  return (
    <Suspense fallback={null}>
      <CompanyPositionsContent />
    </Suspense>
  );
}
