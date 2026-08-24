"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { FAQ_DATA } from "@/lib/data";
import type { FaqItem } from "@/lib/types";

export function Faq({ title = "คำถามที่พบบ่อย", items = FAQ_DATA }: { title?: string; items?: FaqItem[] }) {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-[clamp(20px,4vw,48px)] pt-[clamp(24px,4vw,40px)] pb-[clamp(40px,6vw,56px)]">
      <div className="mb-7 flex items-center gap-3">
        <Image
          src="/mascot/mascot-faq.png"
          alt=""
          width={112}
          height={112}
          className="h-20 w-20 flex-shrink-0 object-contain sm:h-24 sm:w-24"
        />
        <h2 className="text-[clamp(24px,3vw,32px)] font-extrabold tracking-[-0.02em]">{title}</h2>
      </div>
      <div className="flex flex-col gap-px overflow-hidden rounded-2xl border border-[rgba(15,15,15,0.08)] bg-[rgba(15,15,15,0.08)]">
        {items.map((faq, i) => {
          const open = openFaq === i;
          return (
            <div key={faq.q} className="bg-white">
              <div
                onClick={() => setOpenFaq((cur) => (cur === i ? -1 : i))}
                className="flex cursor-pointer items-center justify-between gap-4 px-5 py-[18px]"
              >
                <div className="text-sm font-bold">{faq.q}</div>
                <div className="flex-shrink-0 text-lg text-[#8A8A8A]">{open ? "−" : "+"}</div>
              </div>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
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
