import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { WithElementRef } from "bits-ui";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type { WithElementRef };
