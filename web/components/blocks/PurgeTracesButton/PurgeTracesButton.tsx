"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/util/cn";

/** Deletes all trace rows, with a two-step confirm to avoid an accidental wipe. */
export function PurgeTracesButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const purge = async () => {
    setBusy(true);
    try {
      await fetch("/api/traces", { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
      >
        Purge all traces
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={purge}
        disabled={busy}
        className={cn(
          "rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700",
          busy && "opacity-60",
        )}
      >
        {busy ? "Deleting…" : "Confirm delete"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={busy}
        className="rounded-lg px-3 py-1.5 text-sm text-secondary hover:text-primary"
      >
        Cancel
      </button>
    </div>
  );
}
