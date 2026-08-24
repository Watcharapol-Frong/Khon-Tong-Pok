"use client";

import { RotateCcw, Sparkle } from "lucide-react";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import type { JobFilters } from "@/hooks/useJobFilters";
import { BIZ_LABELS, CATEGORY_TABS, LEVEL_LABELS, LOCATION_LABELS, WORK_TYPE_LABELS } from "@/lib/data";
import type { JobCategory } from "@/lib/types";

const SALARY_MIN_OPTIONS = [0, 20000, 40000, 60000, 80000, 100000];
const SALARY_MAX_OPTIONS: (number | "all")[] = [40000, 60000, 80000, 100000, "all"];

// Same sparkle-corner accent as AuthCard (login/register) and JobFilterBar,
// to tie this sidebar into the same visual language — kept to 2 (not 4) since
// this panel is much taller than those, and 4 corners on a tall sticky panel
// read as scattered rather than framing a single card.
const SIDEBAR_SPARKLES = [
  { top: "1%", left: "-14px", size: 20, color: "#F5D949", rotate: -18, opacity: 0.6 },
  { bottom: "3%", right: "-12px", size: 18, color: "#4D7CFF", rotate: 15, opacity: 0.55 },
];

function CheckboxGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-extrabold">{label}</div>
      <div className="flex flex-col gap-1.5">
        {options.map((opt) => (
          <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={selected.includes(opt.value)}
              onChange={() => onToggle(opt.value)}
              className="h-[15px] w-[15px] flex-shrink-0 accent-[#0F0F0F]"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}

export function JobFilterSidebar({ filters }: { filters: JobFilters }) {
  const {
    searchQuery,
    setSearchQuery,
    category,
    setCategory,
    workTypes,
    toggleWorkType,
    salaryMin,
    setSalaryMin,
    salaryMax,
    setSalaryMax,
    locations,
    toggleLocation,
    locationSummary,
    locationDropdownOpen,
    toggleLocationDropdown,
    levels,
    toggleLevel,
    levelSummary,
    levelDropdownOpen,
    toggleLevelDropdown,
    categories,
    toggleCategoryFilter,
    categorySummary,
    categoryDropdownOpen,
    toggleCategoryDropdown,
    resetFilters,
    hasActiveFilters,
  } = filters;

  return (
    <div className="relative">
      {SIDEBAR_SPARKLES.map((s, i) => (
        <Sparkle
          key={i}
          className="pointer-events-none absolute"
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

      <div className="relative rounded-2xl bg-[#F5F5F5] p-4">
      <div className="relative mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ค้นหางานด้วย AI หรือทักษะ..."
          className="w-full rounded-lg border border-[rgba(15,15,15,0.1)] bg-white py-2 pr-3 pl-3 font-sans text-[13px] text-[#0F0F0F] outline-none"
        />
      </div>

      <div className="mb-4">
        <div className="mb-2 text-[11px] font-extrabold">หมวดหมู่</div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_TABS.map((tab) => {
            const active = category === tab.key;
            return (
              <span
                key={tab.key}
                onClick={() => setCategory(tab.key)}
                className="cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-bold whitespace-nowrap"
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

      <div className="flex flex-col gap-4 border-t border-[rgba(15,15,15,0.08)] pt-4">
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

        <CheckboxGroup
          label="รูปแบบการทำงาน"
          options={["hybrid", "remote", "onsite"].map((v) => ({ value: v, label: WORK_TYPE_LABELS[v] }))}
          selected={workTypes}
          onToggle={toggleWorkType}
        />

        <div>
          <div className="mb-2 text-[11px] font-extrabold">เงินเดือน (บาท)</div>
          <div className="flex items-center gap-1.5">
            <select
              value={salaryMin}
              onChange={(e) => setSalaryMin(Number(e.target.value))}
              className="min-w-0 flex-1 rounded-lg border border-[rgba(15,15,15,0.15)] bg-white px-1.5 py-2 font-sans text-[11px]"
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
              onChange={(e) => setSalaryMax(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="min-w-0 flex-[1.3] rounded-lg border border-[rgba(15,15,15,0.15)] bg-white px-1.5 py-2 font-sans text-[11px]"
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
          label="ระดับตำแหน่งงาน"
          summary={levelSummary}
          options={["entry", "mid-senior", "senior"].map((v) => ({ value: v, label: LEVEL_LABELS[v] }))}
          selected={levels}
          onToggle={toggleLevel}
          open={levelDropdownOpen}
          onToggleOpen={toggleLevelDropdown}
        />

        <MultiSelectDropdown
          label="ประเภทธุรกิจ"
          summary={categorySummary}
          options={["dev", "marketing", "design"].map((v) => ({ value: v, label: BIZ_LABELS[v] }))}
          selected={categories}
          onToggle={(v) => toggleCategoryFilter(v as JobCategory)}
          open={categoryDropdownOpen}
          onToggleOpen={toggleCategoryDropdown}
        />
      </div>

      {hasActiveFilters && (
        <button
          onClick={resetFilters}
          className="mt-4 flex w-full cursor-pointer items-center justify-center gap-1.5 border-t border-[rgba(15,15,15,0.08)] pt-3 text-center text-xs font-bold text-[#5C5C5C]"
        >
          <RotateCcw className="h-3 w-3" strokeWidth={2} /> ล้างตัวกรองทั้งหมด
        </button>
      )}
      </div>
    </div>
  );
}
