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

  // The navbar on Home (the General Landing) is not the same navbar as the
  // one on candidate pages, even though they're the same component —
  // Home doesn't know who's visiting yet, so it needs the full audience
  // fork and a role picker before login. Every other page here (/game,
  // /job, /profile, ...) IS the candidate landing/app context already, so
  // "สำหรับผู้สมัคร" would be redundant (you're already there) and login
  // can skip straight to the candidate form instead of asking again. Home
  // also has no "how it works" content of its own anymore (moved to
  // /game's HowItWorks section), so that link only makes sense elsewhere.
  const isGeneralLanding = pathname === "/";
  const navLinks = isGeneralLanding
    ? NAV_LINKS.filter((l) => l.label !== "วิธีการทำงาน")
    : NAV_LINKS.filter((l) => l.label !== "สำหรับผู้สมัคร");

  // On Home, the pill leads with signup ("เริ่มต้นใช้งานฟรี" -> /register/
  // select) instead of login — a first-time visitor with unknown context
  // is more likely to be starting than returning, matching CompanyNavbar's
  // own "เริ่มใช้งานฟรี" pill pattern. Every candidate page still shows
  // "เข้าสู่ระบบ" -> /login directly, since a returning user wanting to log
  // in is the more likely intent once they're already looking at candidate
  // content specifically.
  const pillLabel = isGeneralLanding ? "เริ่มต้นใช้งานฟรี" : "เข้าสู่ระบบ";
  const pillHref = isGeneralLanding ? "/register/select" : "/login";

  // The pill is hidden entirely on /login/select and /register/select —
  // those pages exist specifically to resolve "which role, and which
  // action" before sending someone to a specific form, and the pill above
  // would otherwise short-circuit exactly that: it'd say "เข้าสู่ระบบ" and
  // jump straight to /login (candidate-only), bypassing the page's own
  // role choice — including on /register/select, where it wouldn't even
  // match the page's own signup purpose. The page's own cards + its
  // cross-link to the other picker already cover both actions completely.
  const hidePill = pathname === "/login/select" || pathname === "/register/select";

  // Gray by default, black once it's the page you're actually on — same
  // active-state convention as CompanyAppNavbar's isActive, just a plain
  // text-color toggle here instead of a filled pill (these are marketing
  // nav links in a shared pill container, not app-shell tabs). Anchor
  // links (#...) never count as active — "วิธีการทำงาน" points at
  // /game#how-it-works, but it's a section within /game, not its own
  // destination, so just being on /game (which "สำหรับผู้สมัคร" also treats
  // as its own page when shown) shouldn't light it up as if it had been
  // navigated to specifically.
  const isActive = (href: string) => {
    if (href.includes("#")) return false;
    const path = href.split("?")[0];
    return path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`);
  };

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
                  className={`cursor-pointer whitespace-nowrap text-sm font-bold ${
                    isActive(link.href) ? "text-[#0F0F0F]" : "text-[#5C5C5C]"
                  }`}
                >
                  {link.label}
                </a>
              ))}
              {!hidePill && (
                <Link
                  href={pillHref}
                  className="flex-shrink-0 cursor-pointer whitespace-nowrap rounded-full bg-[#0F0F0F] px-[18px] py-[11px] text-[13px] font-extrabold text-white"
                >
                  {pillLabel}
                </Link>
              )}
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
                  className={`cursor-pointer rounded-lg px-3 py-[10px] text-sm font-bold ${
                    isActive(link.href) ? "text-[#0F0F0F]" : "text-[#5C5C5C]"
                  }`}
                >
                  {link.label}
                </a>
              ))}
              {!hidePill && (
                <Link
                  href={pillHref}
                  onClick={closeMenu}
                  className="cursor-pointer px-3 py-[10px] text-sm font-semibold text-[#5C5C5C]"
                >
                  {pillLabel}
                </Link>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
