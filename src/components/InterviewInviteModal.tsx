"use client";

import { useState } from "react";
import { AlertCircle, Plus, X } from "lucide-react";

type InterviewInviteModalProps = {
  candidateLabel: string;
  onClose: () => void;
  onSubmit: (proposedTimes: string[]) => void;
};

const MAX_SLOTS = 3;

/** datetime-local's value is "YYYY-MM-DDTHH:mm" — stored as "YYYY-MM-DD HH:mm" per InterviewSlot.proposedTimes. */
function toProposedTimeString(datetimeLocalValue: string): string {
  return datetimeLocalValue.replace("T", " ");
}

export function InterviewInviteModal({
  candidateLabel,
  onClose,
  onSubmit,
}: InterviewInviteModalProps) {
  const [slots, setSlots] = useState<string[]>([""]);
  const [error, setError] = useState("");

  const updateSlot = (index: number, value: string) => {
    setSlots((prev) => prev.map((s, i) => (i === index ? value : s)));
    setError("");
  };

  const addSlot = () => {
    if (slots.length >= MAX_SLOTS) return;
    setSlots((prev) => [...prev, ""]);
  };

  const removeSlot = (index: number) => {
    setSlots((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const proposedTimes = slots.map(toProposedTimeString).filter(Boolean);
    if (proposedTimes.length === 0) {
      setError("กรุณาเลือกวัน-เวลาอย่างน้อย 1 ช่วง");
      return;
    }
    onSubmit(proposedTimes);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] rounded-2xl border border-[rgba(15,15,15,0.1)] bg-white p-5 shadow-[0_20px_50px_rgba(15,15,15,0.15)]"
      >
        <h2 className="mb-1 text-sm font-extrabold text-[#0F0F0F]">นัดสัมภาษณ์</h2>
        <p className="mb-4 text-xs text-[#8A8A8A]">
          เสนอวัน-เวลาสัมภาษณ์ให้ {candidateLabel} (เลือกได้ 1-3 ช่วง)
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-bold text-red-600">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
              <span>{error}</span>
            </div>
          )}

          {slots.map((slot, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={slot}
                onChange={(e) => updateSlot(i, e.target.value)}
                className="flex-1 rounded-xl border border-[rgba(15,15,15,0.12)] bg-white px-3 py-2.5 text-xs font-semibold text-[#0F0F0F] outline-none focus:border-[#0F0F0F]"
              />
              {slots.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSlot(i)}
                  aria-label="ลบช่วงเวลานี้"
                  className="flex-shrink-0 text-[#8A8A8A] hover:text-red-500"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              )}
            </div>
          ))}

          {slots.length < MAX_SLOTS && (
            <button
              type="button"
              onClick={addSlot}
              className="inline-flex items-center gap-1 self-start text-xs font-bold text-[#4D7CFF] hover:opacity-80"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              เพิ่มช่วงเวลา
            </button>
          )}

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[rgba(15,15,15,0.15)] bg-white px-5 py-2.5 text-xs font-bold text-[#5C5C5C]"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex-1 rounded-full bg-[#0F0F0F] py-2.5 text-xs font-extrabold text-white transition-opacity hover:opacity-90"
            >
              ส่งคำเชิญ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
