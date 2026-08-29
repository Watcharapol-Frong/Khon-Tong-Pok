"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import Image from "next/image";
import { FAQ_DATA } from "@/lib/data";
import type { FaqItem } from "@/lib/types";

export function Faq({ title = "คำถามที่พบบ่อย", items = FAQ_DATA }: { title?: string; items?: FaqItem[] }) {
  const [openFaq, setOpenFaq] = useState(0);
  const idPrefix = useId();

  return (
    <div className="mx-auto w-full max-w-[1240px] px-[clamp(20px,4vw,48px)] pt-[clamp(24px,4vw,40px)] pb-[clamp(40px,6vw,56px)]">
      <div className="mb-4 flex items-center gap-3">
        <Image
          src="/mascot/mascot-faq.png"
          alt=""
          width={112}
          height={112}
          className="h-24 w-24 flex-shrink-0 object-contain sm:h-32 sm:w-32"
        />
        <h2 className="mt-3 text-[clamp(24px,3vw,32px)] font-extrabold tracking-[-0.02em] sm:mt-4">
          {title}
        </h2>
      </div>
      <div className="flex flex-col gap-px overflow-hidden rounded-2xl border border-[rgba(15,15,15,0.08)] bg-[rgba(15,15,15,0.08)]">
        {items.map((faq, i) => {
          const open = openFaq === i;
          const panelId = `${idPrefix}-panel-${i}`;
          const buttonId = `${idPrefix}-button-${i}`;
          return (
            <div key={faq.q} className="bg-white">
              <button
                type="button"
                id={buttonId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenFaq((cur) => (cur === i ? -1 : i))}
                className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-[18px] text-left transition-colors hover:bg-[#FAFAFA] focus-visible:bg-[#FAFAFA] focus-visible:outline-none"
              >
                <div className="text-sm font-bold">{faq.q}</div>
                <Plus
                  className={`h-4 w-4 flex-shrink-0 text-[#8A8A8A] transition-transform duration-200 ${open ? "rotate-45" : ""}`}
                  strokeWidth={2.5}
                />
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: "hidden" }}
                  >
                    <div className="max-w-[760px] px-5 pb-[18px] text-[13px] leading-[1.7] text-[#5C5C5C]">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
