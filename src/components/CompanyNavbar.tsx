"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { clearHRSessionIds, getHRSessionIds } from "@/lib/hrSession";

/**
 * Separate from Navbar on purpose — only ever rendered on /company/* pages,
 * so it never needs to guess which section it's in from the pathname.
 * Keeping the two navbars as distinct components (rather than one navbar
 * branching on route + HR session) means a change to one can't accidentally
 * affect the other.
 */
export function CompanyNavbar() {
  const { isTablet } = useBreakpoint();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const open = isTablet && menuOpen;

  // Gray by default, black once it's the page you're actually on — same
  // convention as Navbar.tsx and CompanyAppNavbar's isActive, but exact-
  // match only (no prefix matching): /company/login, /company/register,
  // /company/dashboard etc. are sibling pages under /company, not pages
  // nested under it. Anchor links (#...) never count as active either —
  // "วิธีการทำงาน" points at /company#how-it-works, but it's a section
  // within /company, not its own destination, so just being on /company
  // shouldn't light it up as if it had been navigated to specifically.
  const isActive = (href: string) => !href.includes("#") && pathname === href.split("?")[0];

  // Both auth form pages already carry their own reciprocal in-page link
  // (/company/login -> "สมัครเลย" to /company/register, and vice versa), so
  // repeating "เข้าสู่ระบบ"/"เริ่มต้นใช้งาน" in the navbar there is just
  // noise — same reasoning already applied to /login/select and
  // /register/select.
  const hideAuthLinks = pathname === "/company/login" || pathname === "/company/register";

  // Just a display hint for which nav links to show (dashboard/logout vs.
  // login/register) — not a real auth check, so a plain localStorage read
  // is enough; CompanyAppLayout does the actual server-verified session
  // check for any page that requires login. Starts false so server and
  // client's first render match (avoids a hydration mismatch), then
  // updates once mounted.
  const [session, setSession] = useState(false);
  useEffect(() => {
    // Reading a browser-only source (localStorage) the server can't see —
    // the set-state-in-effect rule assumes state should be derivable from
    // props/other state, which doesn't apply here; a lazy useState
    // initializer would cause a real hydration mismatch instead.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(getHRSessionIds() !== null);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = () => {
    clearHRSessionIds();
    closeMenu();
    router.push("/company/login");
  };

  return (
    <div className="sticky top-0 z-40 bg-white px-4 pt-[26px] pb-3 sm:px-6 md:px-8">
      <div className="relative mx-auto max-w-[900px]">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-full bg-[#F5F5F5] py-[10px] pr-5 pl-[22px]">
          {/* Logo always returns to the General Landing (/), same as every
              other navbar on the site — not back into the HR app context,
              regardless of session state. */}
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
              {session ? (
                <>
                  <Link
                    href="/company/dashboard"
                    className={`cursor-pointer whitespace-nowrap text-sm font-bold ${
                      isActive("/company/dashboard") ? "text-[#0F0F0F]" : "text-[#5C5C5C]"
                    }`}
                  >
                    แดชบอร์ด
                  </Link>
                  <Link
                    href="/company/positions"
                    className={`cursor-pointer whitespace-nowrap text-sm font-bold ${
                      isActive("/company/positions") ? "text-[#0F0F0F]" : "text-[#5C5C5C]"
                    }`}
                  >
                    ตำแหน่งงาน
                  </Link>
                  <Link
                    href="/company/interviews"
                    className={`cursor-pointer whitespace-nowrap text-sm font-bold ${
                      isActive("/company/interviews") ? "text-[#0F0F0F]" : "text-[#5C5C5C]"
                    }`}
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
              ) : (
                <>
                  {/* text-sm font-bold, no gray — matches the primary
                      nav-link style used everywhere else on the site
                      (Navbar.tsx's หางาน/สำหรับองค์กร/วิธีการทำงาน, and this
                      component's own logged-in state below). These aren't
                      secondary actions like "เข้าสู่ระบบ"/"ออกจากระบบ". */}
                  {/* /game, not / — that's the actual candidate-facing page
                      (Navbar.tsx's own "สำหรับผู้สมัคร" points there too),
                      not the neutral General Landing someone would just
                      have to choose their role from again. */}
                  <Link
                    href="/game"
                    className={`cursor-pointer whitespace-nowrap text-sm font-bold ${
                      isActive("/game") ? "text-[#0F0F0F]" : "text-[#5C5C5C]"
                    }`}
                  >
                    สำหรับผู้หางาน
                  </Link>
                  <a
                    href="/company#how-it-works"
                    className={`cursor-pointer whitespace-nowrap text-sm font-bold ${
                      isActive("/company#how-it-works") ? "text-[#0F0F0F]" : "text-[#5C5C5C]"
                    }`}
                  >
                    วิธีการทำงาน
                  </a>
                  {!hideAuthLinks && (
                    <Link
                      href="/company/login"
                      className="cursor-pointer whitespace-nowrap text-sm font-semibold text-[#5C5C5C]"
                    >
                      เข้าสู่ระบบ
                    </Link>
                  )}
                  {/* /company/login, not /register/select — that page's own
                      "กดข้ามได้เลย" guest button is now the fastest way in
                      (real Positions/Matches/interviews pre-seeded, see
                      createGuestHR), so this CTA skips the role picker and
                      the registration form entirely. */}
                  {!hideAuthLinks && (
                    <Link
                      href="/company/login"
                      className="flex-shrink-0 cursor-pointer whitespace-nowrap rounded-full bg-[#0F0F0F] px-[18px] py-[11px] text-[13px] font-extrabold text-white"
                    >
                      เริ่มต้นใช้งาน
                    </Link>
                  )}
                </>
              )}
            </div>
          )}

          {isTablet && (
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
              {session ? (
                <>
                  <Link
                    href="/company/dashboard"
                    onClick={closeMenu}
                    className={`rounded-lg px-3 py-[10px] text-sm font-bold ${
                      isActive("/company/dashboard") ? "text-[#0F0F0F]" : "text-[#5C5C5C]"
                    }`}
                  >
                    แดชบอร์ด
                  </Link>
                  <Link
                    href="/company/positions"
                    onClick={closeMenu}
                    className={`rounded-lg px-3 py-[10px] text-sm font-bold ${
                      isActive("/company/positions") ? "text-[#0F0F0F]" : "text-[#5C5C5C]"
                    }`}
                  >
                    ตำแหน่งงาน
                  </Link>
                  <Link
                    href="/company/interviews"
                    onClick={closeMenu}
                    className={`rounded-lg px-3 py-[10px] text-sm font-bold ${
                      isActive("/company/interviews") ? "text-[#0F0F0F]" : "text-[#5C5C5C]"
                    }`}
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
              ) : (
                <>
                  <Link
                    href="/game"
                    onClick={closeMenu}
                    className={`px-3 py-[10px] text-sm font-bold ${
                      isActive("/game") ? "text-[#0F0F0F]" : "text-[#5C5C5C]"
                    }`}
                  >
                    สำหรับผู้หางาน
                  </Link>
                  <a
                    href="/company#how-it-works"
                    onClick={closeMenu}
                    className={`cursor-pointer px-3 py-[10px] text-sm font-bold ${
                      isActive("/company#how-it-works") ? "text-[#0F0F0F]" : "text-[#5C5C5C]"
                    }`}
                  >
                    วิธีการทำงาน
                  </a>
                  {!hideAuthLinks && (
                    <Link
                      href="/company/login"
                      onClick={closeMenu}
                      className="cursor-pointer px-3 py-[10px] text-sm font-semibold text-[#5C5C5C]"
                    >
                      เข้าสู่ระบบ
                    </Link>
                  )}
                  {!hideAuthLinks && (
                    <Link
                      href="/company/login"
                      onClick={closeMenu}
                      className="px-3 py-[10px] text-sm font-bold"
                    >
                      เริ่มต้นใช้งาน
                    </Link>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
