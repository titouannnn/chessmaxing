import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Global log toggle (0 = disabled, 1 = enabled)
export const log = 1;

export const logger = {
  info: (...args: any[]) => {
    if (log === 1) console.log("%c[INFO]", "color: #3b82f6; font-weight: bold", ...args);
  },
  warn: (...args: any[]) => {
    if (log === 1) console.warn("%c[WARN]", "color: #eab308; font-weight: bold", ...args);
  },
  error: (...args: any[]) => {
    if (log === 1) console.error("%c[ERROR]", "color: #ef4444; font-weight: bold", ...args);
  },
  engine: (...args: any[]) => {
    if (log === 1) console.log("%c[ENGINE]", "color: #10b981; font-weight: bold", ...args);
  }
};
