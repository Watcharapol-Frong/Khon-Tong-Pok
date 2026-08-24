"use client";

import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw, Search, Sparkle, SlidersHorizontal } from "lucide-react";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import type { JobFilters } from "@/hooks/useJobFilters";
import { BIZ_LABELS, CATEGORY_TABS, LEVEL_LABELS, LOCATION_LABELS, WORK_TYPE_LABELS } from "@/lib/data";
import type { JobCategory } from "@/lib/types";

const SALARY_MIN_OPTIONS = [0, 20000, 40000, 60000, 80000, 100000];
const SALARY_MAX_OPTIONS: (number | "all")[] = [40000, 60000, 80000, 100000, "all"];

// Same card-shell language as AuthCard (login/register) — flat accent
// square + sparkle corners — so this reads as the same product instead of
// its own plain bordered box. Candidate green since this bar only ever
// appears on candidate-facing pages (homepage JobMatching, /job).
const FILTER_BAR_SPARKLES = [
  { top: "2%", left: "-18px", size: 20, color: "#F5D949", rotate: -18, opacity: 0.65 },
  { top: "12%", right: "-20px", size: 16, color: "#B14DFF", rotate: 15, opacity: 0.6 },
  { bottom: "16%", left: "-22px", size: 15, color: "#4D7CFF", rotate: 20, opacity: 0.6 },
  { bottom: "4%", right: "-16px", size: 18, color: "#FF5CA8", rotate: -12, opacity: 0.6 },
];

export function JobFilterBar({ filters }: { filters: JobFilters }) {
  const {
    searchQuery,
    setSearchQuery,
    category,
    setCategory,
    filterPanelOpen,
    setFilterPanelOpen,
    workTypes,
    toggleWorkType,
    salaryMin,
    setSalaryMin,
    salaryMax,
    setSalaryMax,
    locations,
    toggleLocation,
    levels,
    toggleLevel,
    categories,
    toggleCategoryFilter,
    locationDropdownOpen,
    toggleLocationDropdown,
    levelDropdownOpen,
    toggleLevelDropdown,
    categoryDropdownOpen,
    toggleCategoryDropdown,
    resetFilters,
    locationSummary,
    levelSummary,
    categorySummary,
  } = filters;

  // A count reads as more useful than the old plain dot — "3 ตัวกรอง"
  // tells you something before you even open the panel. Grouped by filter
  // *type* (5 groups) rather than total selections, so picking 3 locations
  // still reads as "1 filter active", not "3".
  const activeFilterCount =
    (workTypes.length > 0 ? 1 : 0) +
    (salaryMin > 0 || salaryMax !== "all" ? 1 : 0) +
    (locations.length > 0 ? 1 : 0) +
    (levels.length > 0 ? 1 : 0) +
    (categories.length > 0 ? 1 : 0);

  return (
    <div className="relative mb-5">
      {FILTER_BAR_SPARKLES.map((s, i) => (
        <Sparkle
          key={i}
          className="pointer-events-none absolute hidden sm:block"
          style={{
            top: s.top,
            bottom: s.bottom,
            left: s.left,
            right: s.right,
            opacity: s.opacity,
            transform: `rotate(${s.rotate}deg)`,
          }}
          width={s.size}
          height={s.size}
          fill={s.color}
          color={s.color}
          strokeWidth={1}
        />
      ))}

      <div className="relative isolate rounded-2xl bg-[#F5F5F5] p-[10px]">
        <div className="absolute -top-3 -left-3 -z-10 h-12 w-12 rounded-2xl bg-[#3BF55C]" />

      <div className="flex max-w-full flex-wrap items-center gap-[10px]">
        <div className="relative min-w-[200px] flex-[1_1_260px]">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#8A8A8A]"
            strokeWidth={2}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหางานด้วย AI หรือทักษะ..."
            className="w-full rounded-full border border-[rgba(15,15,15,0.1)] bg-white py-[11px] pr-4 pl-10 font-sans text-[13px] text-[#0F0F0F] outline-none transition-colors focus:border-[#0F0F0F]"
          />
        </div>

        <div className="flex min-w-0 flex-[1_1_auto] items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterPanelOpen((v) => !v)}
            className="flex flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-[#0F0F0F] px-[14px] py-[9px] text-xs font-extrabold whitespace-nowrap text-white transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-[#0F0F0F] focus-visible:ring-offset-2"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2} /> กรองผลลัพธ์
            {activeFilterCount > 0 && (
              <span className="flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#3BF55C] px-1 text-[10px] font-extrabold text-[#0F0F0F]">
                {activeFilterCount}
              </span>
            )}
          </button>
          <div className="h-4 w-px flex-shrink-0 bg-[rgba(15,15,15,0.1)]" />
          <div className="no-scrollbar flex min-w-0 items-center gap-1.5 overflow-x-auto">
            {CATEGORY_TABS.map((tab) => {
              const active = category === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setCategory(tab.key)}
                  className="flex-shrink-0 cursor-pointer rounded-full px-[14px] py-[9px] text-xs font-bold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-[#0F0F0F] focus-visible:ring-offset-2"
                  style={{
                    background: active ? "#0F0F0F" : "#FFFFFF",
                    color: active ? "#FFFFFF" : "#5C5C5C",
                    border: active ? "none" : "1px solid rgba(15,15,15,0.1)",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = "rgba(15,15,15,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = "#FFFFFF";
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {filterPanelOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto", transitionEnd: { overflow: "visible" } }}
            exit={{ opacity: 0, height: 0, overflow: "hidden" }}
            transition={{ duration: 0.15 }}
            style={{ overflow: "hidden" }}
            className="mt-[10px] rounded-2xl border border-[rgba(15,15,15,0.08)] bg-[#F5F5F5]"
          >
            <div className="p-[18px]">
            <div className="mb-[14px] flex items-center justify-between border-b border-[rgba(15,15,15,0.1)] pb-3">
              <div className="text-[13px] font-extrabold">ตัวกรองการค้นหาอย่างละเอียด</div>
              <button
                type="button"
                aria-label="ปิดตัวกรอง"
                onClick={() => setFilterPanelOpen(false)}
                className="cursor-pointer rounded-full p-1 text-[13px] font-bold text-[#8A8A8A] transition-colors hover:bg-[rgba(15,15,15,0.06)] hover:text-[#0F0F0F] focus-visible:ring-2 focus-visible:ring-[#0F0F0F]"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
              <div>
                <div className="mb-2 text-[11px] font-extrabold">รูปแบบการทำงาน</div>
                <div className="flex flex-col gap-2">
                  {(["hybrid", "remote", "onsite"] as const).map((v) => (
                    <label key={v} className="flex cursor-pointer items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={workTypes.includes(v)}
                        onChange={() => toggleWorkType(v)}
                        className="h-[15px] w-[15px] accent-[#0F0F0F]"
                      />
                      {WORK_TYPE_LABELS[v]}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-[11px] font-extrabold">เงินเดือน (บาท)</div>
                <div className="flex items-center gap-1.5">
                  <select
                    value={salaryMin}
                    onChange={(e) => setSalaryMin(Number(e.target.value))}
                    className="min-w-0 flex-1 rounded-[10px] border border-[rgba(15,15,15,0.15)] bg-white px-1.5 py-[9px] font-sans text-[11px]"
                  >
                    {SALARY_MIN_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v.toLocaleString()}
                      </option>
                    ))}
                  </select>
                  <span className="flex-shrink-0 text-[#8A8A8A]">-</span>
                  <select
                    value={salaryMax}
                    onChange={(e) =>
                      setSalaryMax(e.target.value === "all" ? "all" : Number(e.target.value))
                    }
                    className="min-w-0 flex-[1.3] rounded-[10px] border border-[rgba(15,15,15,0.15)] bg-white px-1.5 py-[9px] font-sans text-[11px]"
                  >
                    {SALARY_MAX_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v === "all" ? "100,000+" : v.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <MultiSelectDropdown
                label="สถานที่ทำงาน"
                summary={locationSummary}
                options={["bangkok", "upcountry", "anywhere"].map((v) => ({
                  value: v,
                  label: LOCATION_LABELS[v],
                }))}
                selected={locations}
                onToggle={toggleLocation}
                open={locationDropdownOpen}
                onToggleOpen={toggleLocationDropdown}
              />

              <MultiSelectDropdown
                label="ระดับตำแหน่งงาน"
                summary={levelSummary}
                options={["entry", "mid-senior", "senior"].map((v) => ({
                  value: v,
                  label: LEVEL_LABELS[v],
                }))}
                selected={levels}
                onToggle={toggleLevel}
                open={levelDropdownOpen}
                onToggleOpen={toggleLevelDropdown}
              />

              <MultiSelectDropdown
                label="ประเภทธุรกิจ"
                summary={categorySummary}
                options={["dev", "marketing", "design"].map((v) => ({
                  value: v,
                  label: BIZ_LABELS[v],
                }))}
                selected={categories}
                onToggle={(v) => toggleCategoryFilter(v as JobCategory)}
                open={categoryDropdownOpen}
                onToggleOpen={toggleCategoryDropdown}
              />
            </div>

            <div className="mt-3.5 flex items-center justify-between border-t border-[rgba(15,15,15,0.1)] pt-3.5">
              <button
                type="button"
                onClick={resetFilters}
                className="flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-1 text-xs font-bold text-[#5C5C5C] transition-colors hover:bg-[rgba(15,15,15,0.06)] hover:text-[#0F0F0F] focus-visible:ring-2 focus-visible:ring-[#0F0F0F]"
              >
                <RotateCcw className="h-3 w-3" strokeWidth={2} /> ล้างตัวกรองทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => setFilterPanelOpen(false)}
                className="cursor-pointer rounded-full bg-[#0F0F0F] px-4 py-[9px] text-xs font-extrabold text-white transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-[#0F0F0F] focus-visible:ring-offset-2"
              >
                ตกลง
              </button>
            </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
