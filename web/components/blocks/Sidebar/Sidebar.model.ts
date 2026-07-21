"use client";

import { useEffect, useState } from "react";

/**
 * True briefly while the window is being resized. Crossing the md breakpoint
 * swaps the drawer's responsive classes (mobile transform ↔ desktop width), and
 * the CSS transition would animate that swap — making a closed drawer flash in
 * and out. Suppressing transitions during resize avoids it.
 */
export function useIsResizing(): boolean {
  const [resizing, setResizing] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      setResizing(true);
      clearTimeout(timer);
      timer = setTimeout(() => setResizing(false), 200);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(timer);
    };
  }, []);

  return resizing;
}
