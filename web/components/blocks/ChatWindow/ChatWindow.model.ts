"use client";

import { useEffect, useRef } from "react";

// How close to the bottom (px) still counts as "following along". Above this,
// the user has scrolled up to read and we stop auto-scrolling.
const NEAR_BOTTOM_PX = 80;

/**
 * Keeps a scroll container pinned to the bottom as content streams in, so the
 * latest response stays visible. It backs off when the user scrolls up to read
 * earlier messages, but always jumps down when a new message/card is appended
 * (e.g. right after sending). Returns the ref to attach to the scroll element.
 */
export function useAutoScroll(items: unknown[]) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedToBottom = useRef(true);
  const previousLength = useRef(items.length);

  // Track whether the user is following the bottom of the conversation.
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const onScroll = () => {
      const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
      pinnedToBottom.current = distanceFromBottom < NEAR_BOTTOM_PX;
    };
    element.addEventListener("scroll", onScroll, { passive: true });
    return () => element.removeEventListener("scroll", onScroll);
  }, []);

  // On every content change (append or streaming edit), stick to the bottom when
  // appropriate. A new item (grew) always wins so sending jumps to your message.
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const grew = items.length > previousLength.current;
    previousLength.current = items.length;
    if (grew || pinnedToBottom.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [items]);

  return scrollRef;
}
