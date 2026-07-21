"use client";

import { useState } from "react";

export type UseSidebar = {
  open: boolean;
  toggle: () => void;
  close: () => void;
};

/** Open/close state for the harness sidebar. */
export function useSidebar(): UseSidebar {
  const [open, setOpen] = useState(false);
  return {
    open,
    toggle: () => setOpen((value) => !value),
    close: () => setOpen(false),
  };
}
