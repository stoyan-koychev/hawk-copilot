"use client";

import { useState } from "react";
import { cn } from "@/util/cn";

type Rating = 1 | -1;

function Thumb({ down }: { down?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-4 w-4", down && "rotate-180")}
      aria-hidden="true"
    >
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  );
}

/** Thumbs up/down for an assistant turn; posts the rating keyed by turnId. */
export function FeedbackButtons({ turnId }: { turnId: string }) {
  const [rated, setRated] = useState<Rating | null>(null);

  const send = (rating: Rating) => {
    if (rated !== null) return;
    setRated(rating);
    void fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ turn_id: turnId, rating }),
    }).catch(() => {});
  };

  return (
    <div className="flex items-center gap-1 text-secondary/50">
      <button
        type="button"
        aria-label="Good response"
        disabled={rated !== null}
        onClick={() => send(1)}
        className={cn(
          "rounded-md p-1 transition hover:text-primary disabled:hover:text-secondary/50",
          rated === 1 && "text-primary disabled:text-primary",
        )}
      >
        <Thumb />
      </button>
      <button
        type="button"
        aria-label="Bad response"
        disabled={rated !== null}
        onClick={() => send(-1)}
        className={cn(
          "rounded-md p-1 transition hover:text-primary disabled:hover:text-secondary/50",
          rated === -1 && "text-primary disabled:text-primary",
        )}
      >
        <Thumb down />
      </button>
    </div>
  );
}
