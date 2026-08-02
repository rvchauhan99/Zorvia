/** Shared Canadian timezone options for SearchableSelect. */
export const CA_TIMEZONE_OPTIONS = [
  { value: "America/Toronto", label: "America/Toronto (ET)" },
  { value: "America/Vancouver", label: "America/Vancouver (PT)" },
  { value: "America/Edmonton", label: "America/Edmonton (MT)" },
  { value: "America/Winnipeg", label: "America/Winnipeg (CT)" },
  { value: "America/Halifax", label: "America/Halifax (AT)" },
  { value: "America/St_Johns", label: "America/St_Johns (NT)" },
] as const;

export const CA_TIMEZONE_OPTIONS_LONG = [
  { value: "America/Toronto", label: "America/Toronto (EST/EDT)" },
  { value: "America/Vancouver", label: "America/Vancouver (PST/PDT)" },
  { value: "America/Edmonton", label: "America/Edmonton (MST/MDT)" },
  { value: "America/Winnipeg", label: "America/Winnipeg (CST/CDT)" },
  { value: "America/Halifax", label: "America/Halifax (AST/ADT)" },
  { value: "America/St_Johns", label: "America/St_Johns (NST/NDT)" },
] as const;
