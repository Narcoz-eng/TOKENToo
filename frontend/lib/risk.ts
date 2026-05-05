import type { Accent } from "./types";

export function riskAccent(riskTier: string): Accent {
  if (riskTier === "SAFE") return "green";
  if (riskTier === "MEDIUM") return "gold";
  return "red";
}
