"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function MultiSelectDropdown({
  label,
  summary,
  options,
  selected,
  onToggle,
  open,
  onToggleOpen,
}: {
  label: string;
  summary: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  open: boolean;
  onToggleOpen: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onToggleOpen();
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open, onToggleOpen]);

  return (
    <div className="relative" ref={rootRef}>
      <div className="mb-2 text-[11px] font-extrabold">{label}</div>
      <div
        onClick={onToggleOpen}
        className="flex w-full cursor-pointer items-center justify-between gap-1.5 rounded-[10px] border border-[rgba(15,15,15,0.15)] bg-white px-[10px] py-[9px] text-xs"
      >
        <span className="overflow-hidden text-ellipsis whitespace-nowrap">{summary}</span>
        <span className="flex-shrink-0 text-[#8A8A8A]">▾</span>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute top-[calc(100%+4px)] right-0 left-0 z-40 rounded-[10px] border border-[rgba(15,15,15,0.12)] bg-white p-1.5 shadow-[0_8px_20px_rgba(15,15,15,0.12)]"
          >
            {options.map((opt) => (
              <label key={opt.value} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 text-xs">
                <input
                  type="checkbox"
                  checked={selected.includes(opt.value)}
                  onChange={() => onToggle(opt.value)}
                  className="h-[15px] w-[15px] accent-[#0F0F0F]"
                />
                {opt.label}
              </label>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
