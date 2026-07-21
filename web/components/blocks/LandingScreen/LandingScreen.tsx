"use client";

import { Composer } from "@/components/blocks/Composer/Composer";
import { EmptyState } from "@/components/blocks/EmptyState/EmptyState";
import { ExamplePrompts } from "@/components/blocks/ExamplePrompts/ExamplePrompts";
import { useLandingAnimation } from "./LandingScreen.model";

type LandingScreenProps = {
  draft: string;
  busy: boolean;
  onDraftChange: (value: string) => void;
  onSubmit: (text?: string) => void;
};

/** The first-load screen: welcome text, starter prompts, and composer, revealed
 *  one by one with a GSAP entrance timeline. */
export function LandingScreen({ draft, busy, onDraftChange, onSubmit }: LandingScreenProps) {
  const containerRef = useLandingAnimation();

  return (
    <div ref={containerRef} className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex flex-1 flex-col items-center justify-center gap-10">
        <EmptyState />
        <ExamplePrompts onSelect={onSubmit} disabled={busy} />
        <div className="landing-composer reveal w-full">
          <Composer draft={draft} busy={busy} onDraftChange={onDraftChange} onSubmit={onSubmit} />
        </div>
      </div>
    </div>
  );
}
