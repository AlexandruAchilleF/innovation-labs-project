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

/** Telegram messages use HTML parse mode; render them as plain text in previews. */
export function plainText(html: string) {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}
