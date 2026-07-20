"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

// Animated in order, top to bottom, with the composer last.
const TARGETS = [".landing-title", ".landing-subtitle", ".landing-prompt", ".landing-composer"];

/**
 * Plays a one-time entrance timeline on the landing screen: the title, subtitle,
 * each prompt box, then the composer reveal one after another. The elements
 * start hidden via the `.reveal` CSS class (so the server-rendered markup never
 * flashes); this animates them TO visible. useGSAP runs under a layout effect,
 * scopes selectors to the container, and reverts automatically on unmount.
 */
export function useLandingAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Reduced motion: just show everything, no movement.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(TARGETS, { opacity: 1, y: 0 });
        return;
      }

      gsap.set(TARGETS, { opacity: 0, y: 16 });
      gsap
        .timeline({ defaults: { duration: 0.5, ease: "power3.out" } })
        .to(".landing-title", { opacity: 1, y: 0 })
        .to(".landing-subtitle", { opacity: 1, y: 0 }, "-=0.3")
        .to(".landing-prompt", { opacity: 1, y: 0, stagger: 0.12 }, "-=0.1")
        .to(".landing-composer", { opacity: 1, y: 0 }, "-=0.05");
    },
    { scope: containerRef },
  );

  return containerRef;
}
