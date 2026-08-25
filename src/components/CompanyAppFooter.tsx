/**
 * Minimal footer for the authenticated HR app shell — the full marketing
 * Footer (nav columns, sales copy) belongs on public pages, not inside a
 * logged-in dashboard, so this keeps only the copyright line.
 */
export function CompanyAppFooter() {
  return (
    <div className="border-t border-[rgba(15,15,15,0.08)] px-4 py-6 sm:px-6 md:px-10">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-3">
        <div className="text-[12px] text-[#8A8A8A]">© 2026 คนตรงปก (KhonTongPok)</div>
      </div>
    </div>
  );
}
