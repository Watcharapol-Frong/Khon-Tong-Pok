"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBreakpoint } from "@/hooks/useBreakpoint";

const NAV_LINKS = [
  { label: "หางาน", href: "/job" },
  { label: "วิธีใช้งาน", href: "/#how-it-works" },
];

export function Navbar() {
  const { isMobile } = useBreakpoint();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const open = isMobile && menuOpen;

  // "วิธีใช้งาน" explains the candidate-facing home page flow — hide it on
  // pages that aren't that page, since the anchor has nothing to scroll to there.
  const navLinks = pathname === "/" ? NAV_LINKS : NAV_LINKS.filter((l) => l.label !== "วิธีใช้งาน");

  const closeMenu = () => setMenuOpen(false);

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

          {!isMobile && (
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
