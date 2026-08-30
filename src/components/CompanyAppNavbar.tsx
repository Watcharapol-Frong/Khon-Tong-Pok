"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Briefcase, CalendarClock, LayoutDashboard, LogOut } from "lucide-react";
import { NotificationBell, type NotificationItem } from "@/components/NotificationBell";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import type { Company } from "@prisma/client";
import { getHRNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/actions/interview";
import type { SafeHRUser } from "@/lib/companySession";
import { signOut } from "@/lib/signOut";

const NAV_ITEMS = [
  { label: "แดชบอร์ด", href: "/company/dashboard", icon: LayoutDashboard },
  { label: "ตำแหน่งงาน", href: "/company/positions", icon: Briefcase },
  { label: "นัดสัมภาษณ์", href: "/company/interviews", icon: CalendarClock },
];

type CompanyAppNavbarProps = {
  hrUser: SafeHRUser;
  company: Company;
};

/**
 * Top nav for the authenticated HR app shell — rendered once by
 * (app)/layout.tsx, not per-page, so it doesn't remount when navigating
 * between Dashboard/Positions/Interviews. Runs the same sticky-pill shape on
 * every breakpoint (unlike the old sidebar, which switched to a left aside
 * on desktop) so HR always gets a top bar.
 */
export function CompanyAppNavbar({ hrUser, company }: CompanyAppNavbarProps) {
  const { isMobile } = useBreakpoint();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const open = isMobile && menuOpen;

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    getHRNotifications().then((data) => {
      if (!cancelled) setNotifications(data);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hrUser.id is stable for the lifetime of this navbar (rendered once by (app)/layout.tsx)
  }, []);

  const handleMarkRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    markNotificationRead(id);
  };
  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    markAllNotificationsRead();
  };

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = () => {
    signOut();
    closeMenu();
    router.push("/company/login");
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="sticky top-0 z-40 bg-white px-4 pt-[26px] pb-3 sm:px-6 md:px-8">
      <div className="relative mx-auto max-w-[1200px]">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-full bg-[#F5F5F5] py-[10px] pr-5 pl-[22px]">
          <Link href="/company/dashboard" className="flex flex-shrink-0 items-center gap-[10px]">
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
            <div className="flex flex-1 items-center justify-between gap-4 pl-4">
              <nav className="flex items-center gap-1">
                {NAV_ITEMS.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors ${
                        active ? "bg-[#0F0F0F] text-white" : "text-[#5C5C5C] hover:text-[#0F0F0F]"
                      }`}
                    >
                      <item.icon className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="flex flex-shrink-0 items-center gap-3">
                <div className="text-right">
                  <div className="truncate text-xs font-bold text-[#0F0F0F]">{company.name}</div>
                  <div className="truncate text-[11px] text-[#8A8A8A]">{hrUser.name}</div>
                </div>
                <NotificationBell
                  notifications={notifications}
                  onMarkRead={handleMarkRead}
                  onMarkAllRead={handleMarkAllRead}
                />
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="ออกจากระบบ"
                  className="flex flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-white p-2.5 text-[#5C5C5C] transition-colors hover:text-[#0F0F0F]"
                >
                  <LogOut className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
            </div>
          )}

          {isMobile && (
            <div className="flex flex-shrink-0 items-center gap-2">
              <NotificationBell
                notifications={notifications}
                onMarkRead={handleMarkRead}
                onMarkAllRead={handleMarkAllRead}
              />
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
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-[10px] text-sm font-bold ${
                      active ? "bg-[#0F0F0F] text-white" : "text-[#0F0F0F]"
                    }`}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" strokeWidth={2} />
                    {item.label}
                  </Link>
                );
              })}
              <div className="mt-1 border-t border-[rgba(15,15,15,0.08)] pt-2">
                <div className="px-3 py-1 text-[11px] text-[#8A8A8A]">
                  {company.name} · {hrUser.name}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#5C5C5C] hover:bg-[#F0F0F0]"
                >
                  <LogOut className="h-4 w-4 flex-shrink-0" strokeWidth={2} />
                  ออกจากระบบ
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
