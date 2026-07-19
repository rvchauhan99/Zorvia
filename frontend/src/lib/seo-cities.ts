export type CityGuide = {
  slug: string;
  name: string;
  province: string;
  headline: string;
  intro: string;
  localNotes: string[];
  neighborhoods: string;
};

export const CITIES: CityGuide[] = [
  {
    slug: "toronto",
    name: "Toronto",
    province: "Ontario",
    headline: "Tiffin delivery software for Toronto kitchens",
    intro:
      "Toronto’s South Asian food scene runs on subscription tiffins across condos from downtown to Scarborough. MealHQ helps GTA kitchens manage dense routes, Interac payments, and weekday meal quantities without a spreadsheet.",
    localNotes: [
      "Condo and apartment deliveries benefit from clear address + apartment fields and driver Maps links.",
      "Postal FSA sorting helps when you serve multiple towers in M5V, M5B, and beyond.",
      "Interac e-Transfer remains the default payment habit for many subscribers — MealHQ is built around verification, not card-only checkouts.",
    ],
    neighborhoods: "Downtown, Scarborough, North York, East York, and neighbouring Peel routes",
  },
  {
    slug: "mississauga",
    name: "Mississauga",
    province: "Ontario",
    headline: "Manage tiffin deliveries in Mississauga",
    intro:
      "Mississauga and the western GTA host thriving homemade meal businesses. MealHQ gives you daily delivery lists, pause windows for vacations, and Interac reconciliation in CAD.",
    localNotes: [
      "Long suburban routes need sequence and driver assignment — MealHQ supports both.",
      "Share a signup code so families can join your kitchen without another WhatsApp group.",
      "Extra meals for festivals or guests can be added without changing the whole weekly schedule.",
    ],
    neighborhoods: "Erin Mills, Square One area, Malton, Meadowvale, and nearby Brampton spillover",
  },
  {
    slug: "vancouver",
    name: "Vancouver",
    province: "British Columbia",
    headline: "Tiffin business software for Metro Vancouver",
    intro:
      "From Surrey to Burnaby to Vancouver proper, Canadian tiffin kitchens need tools that respect Pacific time cutoffs and Interac. MealHQ’s provider timezone settings keep cancel windows honest.",
    localNotes: [
      "Set your kitchen timezone so consumer cancel and extra-meal cutoffs match local noon.",
      "Multi-day schedules fit students and professionals across the Lower Mainland.",
      "Track outstanding by customer when subscriptions pause for travel.",
    ],
    neighborhoods: "Surrey, Burnaby, Richmond, Vancouver, and New Westminster corridors",
  },
  {
    slug: "calgary",
    name: "Calgary",
    province: "Alberta",
    headline: "Tiffin delivery OS for Calgary kitchens",
    intro:
      "Calgary’s growing Desi food community needs reliable daily lists and clear balances. MealHQ keeps delivered meals, Interac references, and outstanding in one Canadian workspace.",
    localNotes: [
      "Winter pauses are common — use pause windows so routes stay accurate.",
      "Alberta kitchens still settle mostly via Interac; MealHQ mirrors that flow.",
      "Reports and analysis help you see which areas concentrate demand.",
    ],
    neighborhoods: "NE Calgary, downtown cores, and suburban subscription routes",
  },
  {
    slug: "edmonton",
    name: "Edmonton",
    province: "Alberta",
    headline: "Run your Edmonton tiffin kitchen on MealHQ",
    intro:
      "Edmonton providers juggling school-year and summer demand can use MealHQ meal schedules, closed dates, and Interac payment verification without rebuilding spreadsheets every September.",
    localNotes: [
      "Closed dates cover holidays without deleting customers.",
      "Consumer signup codes reduce onboarding friction for new university-year subscribers.",
      "Staff roles let a driver focus on Deliveries while you manage payments.",
    ],
    neighborhoods: "South Edmonton, downtown, and Mill Woods–area routes",
  },
  {
    slug: "ottawa",
    name: "Ottawa",
    province: "Ontario",
    headline: "Tiffin software for Ottawa–Gatineau kitchens",
    intro:
      "Serve bilingual households and government-worker lunch routes with clear CAD outstanding and Interac tracking. MealHQ keeps operations simple while you grow across the capital region.",
    localNotes: [
      "Cutoff hours before local noon reduce same-day cancel chaos.",
      "Outstanding views help when some customers pay weekly vs monthly.",
      "Invite or import customers when migrating off Excel.",
    ],
    neighborhoods: "Centretown, Kanata, Orleans, and Gatineau spillover (ops in English UI)",
  },
];

export function getCity(slug: string): CityGuide | undefined {
  return CITIES.find((c) => c.slug === slug);
}

export function allCitySlugs(): string[] {
  return CITIES.map((c) => c.slug);
}
