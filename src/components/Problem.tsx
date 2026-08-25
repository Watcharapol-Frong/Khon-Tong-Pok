// Trimmed from a 2-card audience-split layout with long paragraphs down to
// a single short statement — the previous version read as a brochure
// paragraph instead of a moment of "ok, I get it." Per content-pruning
// pass: state the mismatch, don't explain it at length.
export function Problem() {
  return (
    <div className="mx-auto w-full max-w-[820px] border-t border-[rgba(15,15,15,0.08)] px-[clamp(20px,4vw,48px)] py-[clamp(40px,6vw,56px)] text-center">
      <div className="mb-4 text-xs font-bold tracking-[0.08em] text-[#8A8A8A] uppercase">
        ปัญหาของการจ้างงานแบบเดิม
      </div>
      <div className="mb-3 text-[clamp(22px,3.4vw,32px)] leading-[1.3] font-extrabold tracking-[-0.02em]">
        Resume ≠ Potential
        <br />
        ประกาศงาน ≠ คนที่ใช่
      </div>
      <p className="mx-auto max-w-[440px] text-sm leading-[1.7] text-[#5C5C5C]">
        เพราะสิ่งสำคัญอย่าง Soft Skill ไม่เคยถูกวัดจริง
      </p>
    </div>
  );
}
