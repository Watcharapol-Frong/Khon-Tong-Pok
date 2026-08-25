"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Bell } from "lucide-react";

export type NotificationItem = {
  id: string;
  message: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: Date;
};

/**
 * Generic bell + dropdown, shared by both the HR (CompanyAppNavbar) and
 * candidate (Navbar) sides — neither knows about the other's notification
 * types, they just fetch their own list and pass it in. No polling: the
 * list is fetched once per page load, matching the rest of the app (no
 * real-time infrastructure exists anywhere else either).
 */
export function NotificationBell({
  notifications,
  onMarkRead,
  onMarkAllRead,
}: {
  notifications: NotificationItem[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}) {
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="การแจ้งเตือน"
        className="relative flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-white text-[#5C5C5C] transition-colors hover:text-[#0F0F0F]"
      >
        <Bell className="h-4 w-4" strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF6E5C] px-1 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Full-screen click-outside catcher, below the dropdown but
                above everything else on the page. */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute top-[calc(100%+8px)] right-0 z-50 w-[320px] max-w-[90vw] rounded-2xl bg-white p-2 shadow-[0_12px_32px_rgba(15,15,15,0.14)]"
            >
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-xs font-extrabold text-[#0F0F0F]">การแจ้งเตือน</span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={onMarkAllRead}
                    className="cursor-pointer text-[11px] font-bold text-[#4D7CFF] hover:opacity-80"
                  >
                    อ่านทั้งหมด
                  </button>
                )}
              </div>
              <div className="max-h-[360px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="p-4 text-center text-xs text-[#8A8A8A]">ยังไม่มีการแจ้งเตือน</p>
                ) : (
                  notifications.map((n) => {
                    const rowClass = `block rounded-xl px-3 py-2.5 text-left text-xs leading-relaxed transition-colors ${
                      n.isRead
                        ? "text-[#5C5C5C] hover:bg-[#FAFAFA]"
                        : "bg-[rgba(77,124,255,0.06)] font-semibold text-[#0F0F0F] hover:bg-[rgba(77,124,255,0.1)]"
                    }`;
                    const handleClick = () => {
                      if (!n.isRead) onMarkRead(n.id);
                      setOpen(false);
                    };
                    return n.linkUrl ? (
                      <Link key={n.id} href={n.linkUrl} onClick={handleClick} className={rowClass}>
                        {n.message}
                      </Link>
                    ) : (
                      <button key={n.id} type="button" onClick={handleClick} className={`w-full ${rowClass}`}>
                        {n.message}
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
