/**
 * Consistent phase badge colors used across all dashboard views.
 * Phase 1 = Blue, Phase 2 = Amber/Orange, Funded = Green
 */
export const getPhaseColorClass = (phase: string): string => {
  const p = (phase || "").toLowerCase();
  if (p === "phase1" || p === "phase 1" || p === "evaluation") return "bg-blue-500/10 text-blue-500";
  if (p === "phase2" || p === "phase 2") return "bg-amber-500/10 text-amber-500";
  if (p === "funded") return "bg-green-500/10 text-green-500";
  return "bg-muted text-muted-foreground";
};

export const formatPhaseLabel = (phase: string): string => {
  const p = (phase || "").toLowerCase();
  if (p === "phase1" || p === "phase 1" || p === "evaluation") return "Phase 1";
  if (p === "phase2" || p === "phase 2") return "Phase 2";
  if (p === "funded") return "Funded";
  return phase || "-";
};
