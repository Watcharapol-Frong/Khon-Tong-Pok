"use client";

import { useEffect, useState } from "react";

/** Mirrors the design reference's custom breakpoints (mobile <480px, tablet <900px). */
export function useBreakpoint() {
  const [state, setState] = useState({ isMobile: false, isTablet: false });

  useEffect(() => {
    const check = () => {
      const isMobile = window.innerWidth < 480;
      const isTablet = window.innerWidth < 900;
      setState((prev) =>
        prev.isMobile === isMobile && prev.isTablet === isTablet ? prev : { isMobile, isTablet }
      );
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return state;
}
