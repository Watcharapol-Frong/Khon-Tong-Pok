"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Briefcase, Calendar, Check, Clock, X } from "lucide-react";
import { Footer } from "@/components/Footer";
import { JobSeekerAuthGuard } from "@/components/JobSeekerAuthGuard";
import { Navbar } from "@/components/Navbar";
import { getMyApplications, respondToInterviewInvite } from "@/lib/actions/interview";
import { useJobSeekerSession } from "@/lib/jobSeekerSessionContext";

type Applications = Awaited<ReturnType<typeof getMyApplications>>;

const MATCH_STATUS_LABEL: Record<string, string> = {
  pending: "รอการติดต่อจาก HR",
  contacted: "นัดสัมภาษณ์แล้ว",
  declined: "ปฏิเสธคำเชิญสัมภาษณ์แล้ว",
};

export default function ApplicationsPage() {
  return (
    <JobSeekerAuthGuard>
      <ApplicationsContent />
    </JobSeekerAuthGuard>
  );
}

function ApplicationsContent() {
  const { jobSeeker } = useJobSeekerSession();
  const [applications, setApplications] = useState<Applications>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  // Which slot's "ปฏิเสธ" button is armed for confirmation — same
  // two-click arm/disarm pattern used for closePosition on the HR side,
  // since declining is a real database write with no undo.
  const [declineArmedId, setDeclineArmedId] = useState<string | null>(null);

  const refresh = async () => {
    const fresh = await getMyApplications();
    setApplications(fresh);
  };

  useEffect(() => {
    let cancelled = false;
    getMyApplications().then((fresh) => {
      if (cancelled) return;
      setApplications(fresh);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- jobSeeker.id is stable for the lifetime of this page (set once by the guard)
  }, []);

  const handleConfirm = async (interviewSlotId: string, confirmedTime: string) => {
    setErrorMsg("");
    const result = await respondToInterviewInvite(interviewSlotId, "confirm", confirmedTime);
    if ("error" in result) {
      setErrorMsg(result.error);
      return;
    }
    await refresh();
  };

  const handleDeclineClick = async (interviewSlotId: string) => {
    if (declineArmedId !== interviewSlotId) {
      setDeclineArmedId(interviewSlotId);
      return;
    }
    setDeclineArmedId(null);
    setErrorMsg("");
    const result = await respondToInterviewInvite(interviewSlotId, "decline");
    if ("error" in result) {
      setErrorMsg(result.error);
      return;
    }
    await refresh();
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F0F0F]">
      <Navbar />

      <div className="mx-auto w-full max-w-[720px] flex-1 px-4 py-10 sm:px-6 md:px-10">
        <h1 className="mb-1 text-[clamp(20px,3.5vw,26px)] font-extrabold tracking-[-0.02em]">ใบสมัครของฉัน</h1>
        <p className="mb-6 text-xs text-[#8A8A8A]">ติดตามสถานะและคำเชิญสัมภาษณ์จากบริษัทที่แมทช์กับคุณ</p>

        {errorMsg && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
            <span>{errorMsg}</span>
          </div>
        )}

        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-[rgba(15,15,15,0.15)] p-8 text-center text-xs text-[#8A8A8A]">
            กำลังโหลด...
          </div>
        ) : applications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[rgba(15,15,15,0.15)] p-8 text-center text-xs text-[#8A8A8A]">
            ยังไม่มีใบสมัคร — เมื่อมีบริษัทแมทช์กับโปรไฟล์ของคุณ รายการจะขึ้นที่นี่
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {applications.map((app) => {
              const slot = app.interviewSlot;
              return (
                <div key={app.id} className="rounded-2xl bg-[#FAFAFA] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-3.5 w-3.5 flex-shrink-0 text-[#8A8A8A]" strokeWidth={1.75} />
                        <span className="text-sm font-extrabold text-[#0F0F0F]">{app.position.title}</span>
                      </div>
                      <div className="mt-0.5 ml-5 text-xs text-[#8A8A8A]">{app.position.company.name}</div>
                    </div>
                    <span className="flex-shrink-0 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-[#5A5A5A]">
                      {MATCH_STATUS_LABEL[app.status] ?? app.status}
                    </span>
                  </div>

                  {slot && slot.status === "pending" && (
                    <div className="mt-3 rounded-xl bg-white p-3">
                      <p className="mb-2 text-xs font-bold text-[#0F0F0F]">
                        <Calendar className="mr-1 inline h-3.5 w-3.5 text-[#4D7CFF]" strokeWidth={2} />
                        มีคำเชิญสัมภาษณ์ — เลือกช่วงเวลาที่สะดวก
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {slot.proposedTimes.map((time) => (
                          <button
                            key={time}
                            type="button"
                            onClick={() => handleConfirm(slot.id, time)}
                            className="flex cursor-pointer items-center justify-between rounded-lg bg-[#F5F5F5] px-3 py-2 text-xs font-semibold text-[#0F0F0F] transition-colors hover:bg-[rgba(59,245,92,0.15)]"
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <Clock className="h-3 w-3 text-[#8A8A8A]" strokeWidth={2} />
                              {time}
                            </span>
                            <span className="text-[10px] font-bold text-[#0f5c22]">เลือกช่วงนี้</span>
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeclineClick(slot.id)}
                        className={`mt-2 inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${
                          declineArmedId === slot.id
                            ? "bg-[#C0392B] text-white hover:opacity-90"
                            : "bg-[#F5F5F5] text-[#5C5C5C] hover:bg-[#F0F0F0]"
                        }`}
                      >
                        <X className="h-3 w-3" strokeWidth={2.5} />
                        {declineArmedId === slot.id ? "ยืนยันปฏิเสธคำเชิญ?" : "ปฏิเสธคำเชิญ"}
                      </button>
                    </div>
                  )}

                  {slot && slot.status === "confirmed" && (
                    <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-[rgba(59,245,92,0.1)] px-3 py-2 text-xs font-bold text-[#0f5c22]">
                      <Check className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={2.5} />
                      ยืนยันสัมภาษณ์แล้ว — {slot.confirmedTime}
                    </div>
                  )}

                  {slot && slot.status === "declined" && (
                    <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-[#F0F0F0] px-3 py-2 text-xs font-bold text-[#8A8A8A]">
                      <X className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
                      คุณปฏิเสธคำเชิญนี้แล้ว
                    </div>
                  )}
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
