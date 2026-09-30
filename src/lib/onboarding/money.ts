// Prices are stored as integer cents; the UI speaks euros with either a comma
// or a dot as decimal separator ("34,5" or "34.5").
export function parseEuroToCents(input: string): number | null {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(input.trim());
  if (!match) {
    return null;
  }
  const [, euros, decimals = ""] = match;
  return Number(euros) * 100 + Number(decimals.padEnd(2, "0"));
}

export function formatCents(cents: number): string {
  const euros = Math.floor(cents / 100);
  const rest = String(cents % 100).padStart(2, "0");
  return `${euros},${rest}`;
}
