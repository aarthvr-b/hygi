// Full class names, so Tailwind sees them. A Studio keeps its color as long as
// there are no more Studios than colors.
const STUDIO_COLORS = [
  "bg-sky-200 text-sky-950",
  "bg-amber-200 text-amber-950",
  "bg-emerald-200 text-emerald-950",
  "bg-rose-200 text-rose-950",
  "bg-violet-200 text-violet-950",
  "bg-lime-200 text-lime-950",
  "bg-orange-200 text-orange-950",
  "bg-teal-200 text-teal-950",
] as const;

export function studioColor(index: number | undefined): string {
  return STUDIO_COLORS[(index ?? 0) % STUDIO_COLORS.length];
}
