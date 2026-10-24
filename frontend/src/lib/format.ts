export function fmt(n: number, decimals = 0): string {
  return new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: "always" as unknown as boolean,
  }).format(n);
}

export function fmtRon(n: number, decimals = 0) {
  return `${fmt(n, decimals)} RON`;
}
