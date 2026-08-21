"use client";

import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import type { JobFilters } from "@/hooks/useJobFilters";
import { BIZ_LABELS, CATEGORY_TABS, LEVEL_LABELS, LOCATION_LABELS, WORK_TYPE_LABELS } from "@/lib/data";
import type { JobCategory } from "@/lib/types";

const SALARY_MIN_OPTIONS = [0, 20000, 40000, 60000, 80000, 100000];
const SALARY_MAX_OPTIONS: (number | "all")[] = [40000, 60000, 80000, 100000, "all"];

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
    hasActiveFilters,
    locationSummary,
    levelSummary,
    categorySummary,
  } = filters;

  return (
    <div className="mb-5 rounded-2xl border border-[rgba(15,15,15,0.1)] bg-[#FAFAFA] p-[10px]">
      <div className="flex max-w-full flex-wrap items-center gap-[10px]">
        <div className="relative min-w-[200px] flex-[1_1_260px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหางานด้วย AI หรือทักษะ..."
            className="w-full rounded-xl border border-[rgba(15,15,15,0.1)] bg-white py-[11px] pr-[76px] pl-4 font-sans text-[13px] text-[#0F0F0F] outline-none"
          />
          <span className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded-lg bg-[#0F0F0F] px-[14px] py-[7px] text-xs font-extrabold text-white">
            ค้นหา
          </span>
        </div>

        <div className="flex min-w-0 flex-[1_1_auto] items-center gap-1.5">
          <span
            onClick={() => setFilterPanelOpen((v) => !v)}
            className="flex flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-[10px] bg-[#0F0F0F] px-[14px] py-[9px] text-xs font-extrabold whitespace-nowrap text-white"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2} /> กรองผลลัพธ์
            {hasActiveFilters && <span className="h-[7px] w-[7px] rounded-full bg-[#3BF55C]" />}
          </span>
          <div className="h-4 w-px flex-shrink-0 bg-[rgba(15,15,15,0.1)]" />
          <div className="no-scrollbar flex min-w-0 items-center gap-1.5 overflow-x-auto">
            {CATEGORY_TABS.map((tab) => {
              const active = category === tab.key;
              return (
                <span
                  key={tab.key}
                  onClick={() => setCategory(tab.key)}
                  className="flex-shrink-0 cursor-pointer rounded-[10px] px-[14px] py-[9px] text-xs font-bold whitespace-nowrap"
                  style={{
                    background: active ? "#0F0F0F" : "#FFFFFF",
                    color: active ? "#FFFFFF" : "#5C5C5C",
                    border: active ? "none" : "1px solid rgba(15,15,15,0.1)",
                  }}
                >
                  {tab.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {filterPanelOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="mt-[10px] overflow-hidden rounded-2xl border border-[rgba(15,15,15,0.08)] bg-[#F5F5F5]"
          >
            <div className="p-[18px]">
            <div className="mb-[14px] flex items-center justify-between border-b border-[rgba(15,15,15,0.1)] pb-3">
              <div className="text-[13px] font-extrabold">ตัวกรองการค้นหาอย่างละเอียด</div>
              <span
                onClick={() => setFilterPanelOpen(false)}
                className="cursor-pointer text-[13px] font-bold text-[#8A8A8A]"
              >
                ✕
              </span>
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
              <span
                onClick={resetFilters}
                className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-[#5C5C5C]"
              >
                <RotateCcw className="h-3 w-3" strokeWidth={2} /> ล้างตัวกรองทั้งหมด
              </span>
              <span
                onClick={() => setFilterPanelOpen(false)}
                className="cursor-pointer rounded-[10px] bg-[#0F0F0F] px-4 py-[9px] text-xs font-extrabold text-white"
              >
                ตกลง
              </span>
            </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
