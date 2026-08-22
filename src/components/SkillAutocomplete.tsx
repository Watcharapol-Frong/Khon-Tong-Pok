"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const MAX_RESULTS = 10;

/** 0 = query is a prefix of the whole option, 1 = query is a prefix of some
 * word within it, 2 = query only matches mid-word. Assumes the caller
 * already confirmed `option` contains `query` (lowercased). */
function matchRank(option: string, query: string): number {
  const lower = option.toLowerCase();
  if (lower.startsWith(query)) return 0;
  if (lower.split(/[^a-z0-9]+/).some((word) => word.startsWith(query))) return 1;
  return 2;
}

/**
 * Searchable multi-select for picking from a large, fixed dictionary of
 * strings (e.g. onetSkills.hardSkills, 8,800+ entries) — a plain
 * MultiSelectDropdown (renders every option as a checkbox) doesn't work at
 * that size. Selection is strictly dictionary-only: values only ever enter
 * `selected` via clicking (or Enter-selecting) a filtered dropdown option,
 * never by submitting arbitrary typed text, so callers never have to
 * validate/normalize what comes out of this component.
 */
export function SkillAutocomplete({
  options,
  selected,
  onChange,
  placeholder = "พิมพ์ค้นหาแล้วเลือกจากรายการ",
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [isOpen]);

  const trimmedQuery = query.trim().toLowerCase();
  // "Contains" match (not prefix-only) so e.g. "Microsoft Excel" is
  // findable via a query like "exc" without requiring the caller to know
  // it doesn't start with "exc". But a plain contains-filter followed by
  // slice(0, 10) would rank purely by the dictionary's own array order —
  // for "exc" that buries "Microsoft Excel" behind a dozen obscure
  // "...Exchange..."/"...excursion..." entries that just happen to sort
  // earlier. Ranked instead: prefix match, then match at the start of any
  // word (word-boundary), then any substring match; shorter/simpler names
  // break ties within a tier so common terms surface before compound ones.
  const matches = trimmedQuery
    ? options
        .filter((opt) => !selected.includes(opt) && opt.toLowerCase().includes(trimmedQuery))
        .map((opt) => ({ opt, rank: matchRank(opt, trimmedQuery) }))
        .sort((a, b) => a.rank - b.rank || a.opt.length - b.opt.length || a.opt.localeCompare(b.opt))
        .slice(0, MAX_RESULTS)
        .map(({ opt }) => opt)
    : [];

  const addSkill = (skill: string) => {
    onChange([...selected, skill]);
    setQuery("");
    inputRef.current?.focus();
  };

  const removeSkill = (skill: string) => {
    onChange(selected.filter((s) => s !== skill));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      // Prevent an Enter here from submitting the surrounding <form> —
      // this input only ever selects from the dropdown, never submits text.
      e.preventDefault();
      if (matches.length > 0) addSkill(matches[0]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[rgba(15,15,15,0.12)] bg-white px-2.5 py-2 focus-within:border-[#0F0F0F]"
      >
        {selected.map((skill) => (
          <span
            key={skill}
            className="flex items-center gap-1 rounded-lg bg-[#F0F0F0] px-2 py-1 text-[11px] font-semibold text-[#0F0F0F]"
          >
            {skill}
            <button
              type="button"
              onClick={() => removeSkill(skill)}
              aria-label={`ลบ ${skill}`}
              className="cursor-pointer text-[#8A8A8A] hover:text-[#0F0F0F]"
            >
              <X className="h-3 w-3" strokeWidth={2.5} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          aria-label={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selected.length === 0 ? placeholder : ""}
          className="min-w-[120px] flex-1 border-none bg-transparent text-xs outline-none"
        />
      </div>

      {isOpen && trimmedQuery && (
        <div className="absolute top-[calc(100%+4px)] right-0 left-0 z-40 max-h-[240px] overflow-y-auto rounded-[10px] border border-[rgba(15,15,15,0.12)] bg-white p-1.5 shadow-[0_8px_20px_rgba(15,15,15,0.12)]">
          {matches.length === 0 ? (
            <div className="px-2 py-2 text-[11px] text-[#8A8A8A]">ไม่พบทักษะที่ตรงกับคำค้นหา</div>
          ) : (
            matches.map((opt) => (
              <button
                type="button"
                key={opt}
                onClick={() => addSkill(opt)}
                className="block w-full cursor-pointer rounded-lg px-2 py-2 text-left text-xs hover:bg-[#F5F5F5]"
              >
                {opt}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
