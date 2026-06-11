import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extract a human-readable error message from an unknown error value.
 * Handles native Error, Supabase PostgrestError-like shapes, strings, and unknown objects.
 */
export function getErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null) {
    const maybe = err as { message?: unknown; error_description?: unknown };
    if (typeof maybe.message === "string") return maybe.message;
    if (typeof maybe.error_description === "string") return maybe.error_description;
  }
  return fallback;
}

