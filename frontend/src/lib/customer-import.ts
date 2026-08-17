/** Policy-specific sample CSVs for guided customer import. */

import { CA_PROVINCES } from "@/lib/ca-provinces";
import { CA_CITIES_BY_PROVINCE } from "@/lib/ca-cities";

export type ImportBillingPolicy = "per_meal" | "monthly_adjustable" | "monthly_fixed";

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export const IMPORT_POLICY_OPTIONS: { value: ImportBillingPolicy; label: string; hint: string }[] = [
  {
    value: "per_meal",
    label: "Per-meal",
    hint: "Charge per delivered meal. Set delivery_days plus lunch_qty / dinner_qty.",
  },
  {
    value: "monthly_adjustable",
    label: "Adjustable Monthly",
    hint: "last_collection_status: collected = last collection taken (balance ~$0); pending = last collection still open (due that date).",
  },
  {
    value: "monthly_fixed",
    label: "Fixed Monthly",
    hint: "last_collection_status: collected = last collection taken (balance ~$0); pending = last collection still open (due that date).",
  },
];

const PER_MEAL_HEADER =
  "name,phone,email,address,apartment,city,province,postal_code,delivery_days,lunch_qty,dinner_qty,driver_name,opening_balance,joining_date,notes";

const MONTHLY_HEADER =
  "name,phone,email,address,apartment,city,province,postal_code,monthly_plan,lunch_qty,dinner_qty,driver_name,joining_date,payment_collection_day,last_collection_status,notes,meal_type";

const SAMPLE_PER_MEAL = `${PER_MEAL_HEADER},meal_price,meal_type
Aarav Sharma,4165551212,aarav@example.com,45 Bloor St W,Unit 302,Toronto,ON,M5S 1M2,"0,1,2,3,4",0,2,Alex Driver,45.00,2026-01-15,Gate code 12,12,regular
Priya Patel,6475559898,priya@example.com,100 King St E,,Mississauga,ON,L5B 3Y4,"0,2,4",1,1,Alex Driver,0,2025-11-01,,14,Jain
Neha Gupta,9055553344,neha@example.com,12 Queen St W,Suite 5,Brampton,ON,L6Y 1N2,"1,3,5",1,0,Alex Driver,-20,2026-03-01,Leave at concierge,12,FASTING
`;

const SAMPLE_MONTHLY_ADJ = `${MONTHLY_HEADER}
Aarav Sharma,4165551212,aarav@example.com,45 Bloor St W,Unit 302,Toronto,ON,M5S 1M2,Mon-Fri,0,2,Alex Driver,2026-01-15,15,collected,Gate code 12,regular
Priya Patel,6475559898,priya@example.com,100 King St E,,Mississauga,ON,L5B 3Y4,Mon-Fri,1,1,Alex Driver,2025-11-01,1,pending,,Jain
Neha Gupta,9055553344,neha@example.com,12 Queen St W,Suite 5,Brampton,ON,L6Y 1N2,Mon-Sat,1,0,Alex Driver,2026-03-01,15,pending,Leave at concierge,FASTING
`;

const SAMPLE_MONTHLY_FIXED = `${MONTHLY_HEADER}
Aarav Sharma,4165551212,aarav@example.com,45 Bloor St W,Unit 302,Toronto,ON,M5S 1M2,Mon-Fri,0,2,Alex Driver,2026-01-15,15,collected,Gate code 12,regular
Priya Patel,6475559898,priya@example.com,100 King St E,,Mississauga,ON,L5B 3Y4,Mon-Fri,1,1,Alex Driver,2025-11-01,1,pending,,Jain
Neha Gupta,9055553344,neha@example.com,12 Queen St W,Suite 5,Brampton,ON,L6Y 1N2,Mon-Sat,2,2,Alex Driver,2026-03-01,15,collected,Buzzer 305,FASTING
`;

export function sampleCsvForPolicy(policy: ImportBillingPolicy): string {
  if (policy === "monthly_adjustable") return SAMPLE_MONTHLY_ADJ;
  if (policy === "monthly_fixed") return SAMPLE_MONTHLY_FIXED;
  return SAMPLE_PER_MEAL;
}

export function sampleFilename(policy: ImportBillingPolicy): string {
  return `mealhq-customers-${policy.replace(/_/g, "-")}-sample.csv`;
}

export function downloadSampleCsv(policy: ImportBillingPolicy) {
  const blob = new Blob([sampleCsvForPolicy(policy)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = sampleFilename(policy);
  a.click();
  URL.revokeObjectURL(url);
}

/** Flatten curated CA provinces × cities for import reference. */
export function buildProvinceCityMasterCsv(): string {
  const lines = ["province,province_name,city"];
  for (const { code, name } of CA_PROVINCES) {
    const cities = CA_CITIES_BY_PROVINCE[code] || [];
    for (const city of cities) {
      lines.push(`${code},${csvEscape(name)},${csvEscape(city)}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

export function downloadProvinceCityMasterCsv() {
  const blob = new Blob([buildProvinceCityMasterCsv()], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mealhq-province-city-master.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/** Build WebSocket URL for import job. Prefer direct backend WS (Next rewrites often skip WS). */
export function importJobWsUrl(jobId: string, token: string): string {
  if (typeof window === "undefined") return "";
  const backend =
    (process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_WS_URL || "").replace(/\/$/, "");
  if (backend) {
    const base = backend.replace(/^http/, "ws");
    return `${base}/api/customers/import/${jobId}/ws?token=${encodeURIComponent(token)}`;
  }
  // Local default matches Next rewrite (127.0.0.1:8000) — avoid WS via Next /api proxy.
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return `ws://127.0.0.1:8000/api/customers/import/${jobId}/ws?token=${encodeURIComponent(token)}`;
  }
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/api/customers/import/${jobId}/ws?token=${encodeURIComponent(token)}`;
}
