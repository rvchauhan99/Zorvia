/** Canadian provinces and territories (ISO 3166-2:CA codes). */
export const CA_PROVINCES: { code: string; name: string }[] = [
  { code: "AB", name: "Alberta" },
  { code: "BC", name: "British Columbia" },
  { code: "MB", name: "Manitoba" },
  { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland and Labrador" },
  { code: "NS", name: "Nova Scotia" },
  { code: "NT", name: "Northwest Territories" },
  { code: "NU", name: "Nunavut" },
  { code: "ON", name: "Ontario" },
  { code: "PE", name: "Prince Edward Island" },
  { code: "QC", name: "Quebec" },
  { code: "SK", name: "Saskatchewan" },
  { code: "YT", name: "Yukon" },
];

/** Soft validate Canadian postal code (A1A 1A1 or A1A1A1). */
export function isValidCaPostal(raw: string): boolean {
  const s = (raw || "").replace(/\s+/g, "").toUpperCase();
  return /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\d[ABCEGHJ-NPRSTV-Z]\d$/.test(s);
}

export function formatCaPostal(raw: string): string {
  const s = (raw || "").replace(/\s+/g, "").toUpperCase();
  if (s.length === 6) return `${s.slice(0, 3)} ${s.slice(3)}`;
  return (raw || "").toUpperCase();
}
