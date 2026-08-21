"use client";

import { useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { clearHRSession, getSessionSnapshot, subscribeToStore } from "@/lib/companyStore";

const NAV_LINKS = [
  { label: "หางาน", href: "/job" },
  { label: "วิธีใช้งาน", href: "/#how-it-works" },
];

const getServerSessionSnapshot = () => null;

export function Navbar() {
  const { isMobile } = useBreakpoint();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const open = isMobile && menuOpen;

  const isCompanyRoute = pathname.startsWith("/company");

  // Only meaningful on /company/* routes — harmless elsewhere, since
  // getSessionSnapshot() reads the HR session key that candidate pages never
  // set. Called unconditionally because hooks can't be called conditionally.
  const session = useSyncExternalStore(
    subscribeToStore,
    getSessionSnapshot,
    getServerSessionSnapshot
  );
  const hrContext = isCompanyRoute && session;

  // "วิธีใช้งาน" explains the candidate-facing home page flow — hide it on
  // pages that aren't that page, since the anchor has nothing to scroll to there.
  const navLinks = pathname === "/" ? NAV_LINKS : NAV_LINKS.filter((l) => l.label !== "วิธีใช้งาน");

  const logoHref = isCompanyRoute ? (session ? "/company/dashboard" : "/company") : "/";

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = () => {
    clearHRSession();
    closeMenu();
    router.push("/company/login");
  };

  return (
    <div className="sticky top-0 z-40 bg-white px-4 pt-[26px] pb-3 sm:px-6 md:px-8">
      <div className="relative mx-auto max-w-[900px]">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-full bg-[#F5F5F5] py-[10px] pr-5 pl-[22px]">
          <Link href={logoHref} className="flex flex-shrink-0 items-center gap-[10px]">
            <div className="h-[30px] w-[30px] flex-shrink-0 rounded-lg bg-[#0F0F0F]" />
            <div className="whitespace-nowrap text-[clamp(15px,4vw,20px)] font-extrabold tracking-[-0.02em]">
              คนตรงปก
            </div>
          </Link>

          {!isMobile && (
            <div className="flex flex-wrap items-center gap-[clamp(10px,2vw,24px)]">
              {hrContext ? (
                <>
                  <Link
                    href="/company/dashboard"
                    className="cursor-pointer whitespace-nowrap text-sm font-bold"
                  >
                    แดชบอร์ด
                  </Link>
                  <Link
                    href="/company/positions"
                    className="cursor-pointer whitespace-nowrap text-sm font-bold"
                  >
                    ตำแหน่งงาน
                  </Link>
                  <Link
                    href="/company/interviews"
                    className="cursor-pointer whitespace-nowrap text-sm font-bold"
                  >
                    นัดสัมภาษณ์
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="cursor-pointer whitespace-nowrap text-sm font-semibold text-[#5C5C5C]"
                  >
                    ออกจากระบบ
                  </button>
                  <Link
                    href="/company/positions?new=1"
                    className="flex-shrink-0 cursor-pointer whitespace-nowrap rounded-full bg-[#0F0F0F] px-[18px] py-[11px] text-[13px] font-extrabold text-white"
                  >
                    + สร้างตำแหน่งงานใหม่
                  </Link>
                </>
              ) : isCompanyRoute ? (
                <>
                  <Link
                    href="/"
                    className="cursor-pointer whitespace-nowrap text-sm font-semibold text-[#5C5C5C]"
                  >
                    สำหรับผู้หางาน
                  </Link>
                  <Link
                    href="/company/login"
                    className="cursor-pointer whitespace-nowrap text-sm font-semibold text-[#5C5C5C]"
                  >
                    เข้าสู่ระบบ
                  </Link>
                  <Link
                    href="/company/register"
                    className="flex-shrink-0 cursor-pointer whitespace-nowrap rounded-full bg-[#0F0F0F] px-[18px] py-[11px] text-[13px] font-extrabold text-white"
                  >
                    เริ่มใช้งานฟรี
                  </Link>
                </>
              ) : (
                <>
                  {navLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      className="cursor-pointer whitespace-nowrap text-sm font-bold"
                    >
                      {link.label}
                    </a>
                  ))}
                  <Link
                    href="/company"
                    className="cursor-pointer whitespace-nowrap text-sm font-semibold text-[#5C5C5C]"
                  >
                    สำหรับองค์กร
                  </Link>
                  <Link
                    href="/login"
                    className="cursor-pointer whitespace-nowrap text-sm font-semibold text-[#5C5C5C]"
                  >
                    เข้าสู่ระบบ
                  </Link>
                  <Link
                    href="/game"
                    className="flex-shrink-0 cursor-pointer whitespace-nowrap rounded-full bg-[#0F0F0F] px-[18px] py-[11px] text-[13px] font-extrabold text-white"
                  >
                    เริ่มเล่นเกมเพื่อประเมิน
                  </Link>
                </>
              )}
            </div>
          )}

          {isMobile && (
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
              {hrContext ? (
                <>
                  <Link
                    href="/company/dashboard"
                    onClick={closeMenu}
                    className="rounded-lg px-3 py-[10px] text-sm font-bold"
                  >
                    แดชบอร์ด
                  </Link>
                  <Link
                    href="/company/positions"
                    onClick={closeMenu}
                    className="rounded-lg px-3 py-[10px] text-sm font-bold"
                  >
                    ตำแหน่งงาน
                  </Link>
                  <Link
                    href="/company/interviews"
                    onClick={closeMenu}
                    className="rounded-lg px-3 py-[10px] text-sm font-bold"
                  >
                    นัดสัมภาษณ์
                  </Link>
                  <Link
                    href="/company/positions?new=1"
                    onClick={closeMenu}
                    className="rounded-lg px-3 py-[10px] text-sm font-bold"
                  >
                    + สร้างตำแหน่งงานใหม่
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="cursor-pointer rounded-lg px-3 py-[10px] text-left text-sm font-semibold text-[#5C5C5C]"
                  >
                    ออกจากระบบ
                  </button>
                </>
              ) : isCompanyRoute ? (
                <>
                  <Link
                    href="/"
                    onClick={closeMenu}
                    className="px-3 py-[10px] text-sm font-bold"
                  >
                    สำหรับผู้หางาน
                  </Link>
                  <Link
                    href="/company/login"
                    onClick={closeMenu}
                    className="cursor-pointer px-3 py-[10px] text-sm font-semibold text-[#5C5C5C]"
                  >
                    เข้าสู่ระบบ
                  </Link>
                  <Link
                    href="/company/register"
                    onClick={closeMenu}
                    className="px-3 py-[10px] text-sm font-bold"
                  >
                    เริ่มใช้งานฟรี
                  </Link>
                </>
              ) : (
                <>
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
                    href="/company"
                    onClick={closeMenu}
                    className="px-3 py-[10px] text-sm font-bold"
                  >
                    สำหรับองค์กร
                  </Link>
                  <Link
                    href="/login"
                    onClick={closeMenu}
                    className="cursor-pointer px-3 py-[10px] text-sm font-semibold text-[#5C5C5C]"
                  >
                    เข้าสู่ระบบ
                  </Link>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
