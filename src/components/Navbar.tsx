"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationBell, type NotificationItem } from "@/components/NotificationBell";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { getJobSeekerNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/actions/interview";
import { getJobSeekerSessionIds } from "@/lib/jobSeekerSession";

// "หางาน" (direct job browsing) alongside the General Landing's own
// audience fork (Hero's "สำหรับผู้หางาน" / "สำหรับองค์กร" CTAs), instead of
// only the fork — the nav is shared across every page, so it should read
// as general-audience everywhere, not just on Home, but browsing jobs
// directly is still a distinct, common enough action to keep its own link.
const NAV_LINKS = [
  { label: "หางาน", href: "/job" },
  { label: "สำหรับผู้สมัคร", href: "/game" },
  { label: "สำหรับองค์กร", href: "/company" },
  { label: "วิธีการทำงาน", href: "/game#how-it-works" },
];

export function Navbar() {
  const { isTablet } = useBreakpoint();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const open = isTablet && menuOpen;

  // Home doesn't have its own "how it works" content anymore (that moved to
  // /game's HowItWorks section) — "วิธีการทำงาน" would just navigate away
  // from Home into content someone didn't come here for, so it's hidden
  // there. Every other candidate page still gets it, linking into /game's
  // section same as before.
  const navLinks = pathname === "/" ? NAV_LINKS.filter((l) => l.label !== "วิธีการทำงาน") : NAV_LINKS;

  const closeMenu = () => setMenuOpen(false);

  // This navbar renders on public pages too (login/register/home) where
  // there's no job seeker session at all — the bell only shows up once one
  // actually exists, checked client-side on mount (no session -> stays null
  // forever, nothing fetched).
  const [jobSeekerId, setJobSeekerId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const ids = getJobSeekerSessionIds();
    if (!ids) return;
    // Reading a browser-only source (localStorage) the server can't see,
    // not state derivable from props/other state — same exception already
    // established for this pattern elsewhere (e.g. /profile).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJobSeekerId(ids.jobSeekerId);
    let cancelled = false;
    getJobSeekerNotifications(ids.jobSeekerId).then((data) => {
      if (!cancelled) setNotifications(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleMarkRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    markNotificationRead(id);
  };
  const handleMarkAllRead = () => {
    if (!jobSeekerId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    markAllNotificationsRead({ jobSeekerId });
  };

  return (
    <div className="sticky top-0 z-40 bg-white px-4 pt-[26px] pb-3 sm:px-6 md:px-8">
      <div className="relative mx-auto max-w-[900px]">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-full bg-[#F5F5F5] py-[10px] pr-5 pl-[22px]">
          <Link href="/" className="flex flex-shrink-0 items-center gap-[10px]">
            <Image
              src="/mascot/mascot-navbar-icon.png"
              alt=""
              width={44}
              height={44}
              className="h-[clamp(34px,9vw,44px)] w-[clamp(34px,9vw,44px)] flex-shrink-0 object-contain"
            />
            <div className="whitespace-nowrap text-[clamp(15px,4vw,20px)] font-extrabold tracking-[-0.02em]">
              คนตรงปก
            </div>
          </Link>

          {!isTablet && (
            <div className="flex flex-wrap items-center gap-[clamp(10px,2vw,24px)]">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="cursor-pointer whitespace-nowrap text-sm font-bold"
                >
                  {link.label}
                </a>
              ))}
              {/* Single black-pill CTA now — "เริ่มต้นใช้งาน" (which always
                  went to /game, i.e. only the candidate path) is gone, since
                  a nav shared by both audiences shouldn't default to one of
                  them. "เข้าสู่ระบบ" takes over as the pill and routes
                  through a role picker first, since /login and
                  /company/login are two different forms. */}
              <Link
                href="/login/select"
                className="flex-shrink-0 cursor-pointer whitespace-nowrap rounded-full bg-[#0F0F0F] px-[18px] py-[11px] text-[13px] font-extrabold text-white"
              >
                เข้าสู่ระบบ
              </Link>
              {/* Notifications belong to the logged-in candidate experience,
                  not this public marketing shell — Home stays notification-
                  free even if a session persists from an earlier login,
                  same as the HR side only ever shows them inside the
                  authenticated CompanyAppNavbar, never on the public one. */}
              {jobSeekerId && pathname !== "/" && (
                <NotificationBell
                  notifications={notifications}
                  onMarkRead={handleMarkRead}
                  onMarkAllRead={handleMarkAllRead}
                />
              )}
            </div>
          )}

          {isTablet && (
            <div className="flex flex-shrink-0 items-center gap-2">
              {jobSeekerId && pathname !== "/" && (
                <NotificationBell
                  notifications={notifications}
                  onMarkRead={handleMarkRead}
                  onMarkAllRead={handleMarkAllRead}
                />
              )}
              <button
                aria-label="เปิดเมนู"
                onClick={() => setMenuOpen((v) => !v)}
                className="relative h-[34px] w-[34px] flex-shrink-0 cursor-pointer"
              >
                <motion.div
                  animate={open ? { translateY: 5, rotate: 45 } : { translateY: 0, rotate: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="absolute top-[11px] left-[6px] h-[2px] w-[22px] rounded-full bg-[#0F0F0F]"
                  style={{ transformOrigin: "center" }}
                />
                <motion.div
                  animate={{ opacity: open ? 0 : 1 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="absolute top-[16px] left-[6px] h-[2px] w-[22px] rounded-full bg-[#0F0F0F]"
                />
                <motion.div
                  animate={open ? { translateY: -5, rotate: -45 } : { translateY: 0, rotate: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="absolute top-[21px] left-[6px] h-[2px] w-[22px] rounded-full bg-[#0F0F0F]"
                  style={{ transformOrigin: "center" }}
                />
              </button>
            </div>
          )}
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute top-[calc(100%+8px)] right-0 left-0 z-50 flex flex-col gap-1 rounded-[20px] bg-[#F5F5F5] p-[14px] shadow-[0_12px_32px_rgba(15,15,15,0.14)]"
            >
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  className="cursor-pointer rounded-lg px-3 py-[10px] text-sm font-bold"
                >
                  {link.label}
                </a>
              ))}
              <Link
                href="/login/select"
                onClick={closeMenu}
                className="cursor-pointer px-3 py-[10px] text-sm font-semibold text-[#5C5C5C]"
              >
                เข้าสู่ระบบ
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
