"use client";

import { X } from "lucide-react";

type ResumePreviewModalProps = {
  resumeUrl: string;
  candidateLabel: string;
  onClose: () => void;
};

/** Same overlay/backdrop-click-to-close pattern as InterviewInviteModal, sized for a document instead of a form — near-fullscreen so the embedded PDF has real room, not the max-w-[420px] a form modal uses. */
export function ResumePreviewModal({ resumeUrl, candidateLabel, onClose }: ResumePreviewModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full max-h-[90vh] w-full max-w-[900px] flex-col overflow-hidden rounded-2xl border border-[rgba(15,15,15,0.1)] bg-white shadow-[0_20px_50px_rgba(15,15,15,0.15)]"
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-[rgba(15,15,15,0.08)] px-4 py-3">
          <h2 className="text-xs font-extrabold text-[#0F0F0F]">เรซูเม่ — {candidateLabel}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[#8A8A8A] transition-colors hover:bg-[#F0F0F0] hover:text-[#0F0F0F]"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <iframe src={resumeUrl} title={`เรซูเม่ — ${candidateLabel}`} className="min-h-0 flex-1" />
      </div>
    </div>
  );
}
