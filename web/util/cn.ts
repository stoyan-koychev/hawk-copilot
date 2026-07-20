import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combine class names conditionally and resolve conflicting Tailwind utilities.
 * clsx flattens strings/arrays/objects into a class list; tailwind-merge then
 * lets a later utility win over an earlier conflicting one (e.g. `px-2 px-4`).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
