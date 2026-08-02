"use client";

import { useMemo, useState } from "react";
import { BIZ_LABELS, JOBS, LEVEL_LABELS, LOCATION_LABELS } from "@/lib/data";
import type { JobCategory, JobLevel } from "@/lib/types";

function matchesSmartQuery(query: string, category: JobCategory) {
  if (query.includes("dev") || query.includes("critical") || query.includes("แก้ปัญหา") || query.includes("react"))
    return category === "dev";
  if (query.includes("marketing") || query.includes("กดดัน") || query.includes("ความเสี่ยง") || query.includes("growth"))
    return category === "marketing";
  if (query.includes("design") || query.includes("ยืดหยุ่น") || query.includes("ปรับตัว") || query.includes("ux"))
    return category === "design";
  return false;
}

export function useJobFilters() {
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategoryState] = useState<"all" | JobCategory>("all");
  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [workTypes, setWorkTypes] = useState<string[]>([]);
  const [salaryMin, setSalaryMin] = useState(0);
  const [salaryMax, setSalaryMax] = useState<number | "all">("all");
  const [locations, setLocations] = useState<string[]>([]);
  const [levels, setLevels] = useState<JobLevel[]>([]);
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [levelDropdownOpen, setLevelDropdownOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  const setCategory = (key: "all" | JobCategory) => {
    setCategoryState(key);
    setCategories(key === "all" ? [] : [key]);
  };

  const toggleArrayValue = <T,>(setter: (fn: (arr: T[]) => T[]) => void, value: T) => {
    setter((arr) => (arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]));
  };

  const toggleWorkType = (v: string) => toggleArrayValue(setWorkTypes, v);
  const toggleLocation = (v: string) => toggleArrayValue(setLocations, v);
  const toggleLevel = (v: string) => toggleArrayValue(setLevels, v as JobLevel);
  const toggleCategoryFilter = (value: JobCategory) => {
    toggleArrayValue(setCategories, value);
    setCategoryState("all");
  };

  const toggleLocationDropdown = () => {
    setLocationDropdownOpen((v) => !v);
    setLevelDropdownOpen(false);
    setCategoryDropdownOpen(false);
  };
  const toggleLevelDropdown = () => {
    setLevelDropdownOpen((v) => !v);
    setLocationDropdownOpen(false);
    setCategoryDropdownOpen(false);
  };
  const toggleCategoryDropdown = () => {
    setCategoryDropdownOpen((v) => !v);
    setLocationDropdownOpen(false);
    setLevelDropdownOpen(false);
  };

  const resetFilters = () => {
    setWorkTypes([]);
    setSalaryMin(0);
    setSalaryMax("all");
    setLocations([]);
    setLevels([]);
    setCategories([]);
    setCategoryState("all");
    setSearchQuery("");
  };

  const filteredJobs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const effectiveCategories = category !== "all" ? [category] : categories;
    const maxCap = salaryMax === "all" ? Infinity : salaryMax;
    return JOBS.filter((j) => {
      if (effectiveCategories.length > 0 && !effectiveCategories.includes(j.category)) return false;
      if (workTypes.length > 0 && !workTypes.includes(j.workType)) return false;
      if (!(j.salaryMax >= salaryMin && j.salaryMin <= maxCap)) return false;
      if (locations.length > 0) {
        const matchesAny = locations.some((loc) => {
          if (loc === "bangkok") return j.city === "bangkok";
          if (loc === "upcountry") return j.city === "upcountry";
          if (loc === "anywhere") return j.workType === "remote";
          return false;
        });
        if (!matchesAny) return false;
      }
      if (levels.length > 0 && !levels.includes(j.level)) return false;
      if (q) {
        const text = (j.title + " " + j.company + " " + j.hardSkills).toLowerCase();
        if (!text.includes(q) && !matchesSmartQuery(q, j.category)) return false;
      }
      return true;
    });
  }, [searchQuery, category, categories, workTypes, salaryMin, salaryMax, locations, levels]);

  const hasActiveFilters =
    workTypes.length > 0 ||
    salaryMin > 0 ||
    salaryMax !== "all" ||
    locations.length > 0 ||
    levels.length > 0 ||
    categories.length > 0;

  const locationSummary =
    locations.length === 0 ? "ทุกสถานที่" : locations.map((v) => LOCATION_LABELS[v]).join(", ");
  const levelSummary = levels.length === 0 ? "ทุกระดับ" : levels.map((v) => LEVEL_LABELS[v]).join(", ");
  const categorySummary =
    categories.length === 0 ? "ทุกประเภท" : categories.map((v) => BIZ_LABELS[v]).join(", ");

  return {
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
    filteredJobs,
    hasActiveFilters,
    locationSummary,
    levelSummary,
    categorySummary,
  };
}

export type JobFilters = ReturnType<typeof useJobFilters>;
