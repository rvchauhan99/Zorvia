export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  paragraphs: string[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "interac-payments-for-tiffin-businesses",
    title: "How Canadian tiffin businesses collect Interac payments",
    description: "Why Interac e-Transfer dominates homemade meal subscriptions in Canada — and how MealHQ verifies references against outstanding.",
    date: "2026-07-01",
    paragraphs: [
      "Most independent Canadian tiffin kitchens do not want to force every subscriber onto a card processor on day one. Interac e-Transfer is familiar, low-friction, and already how families pay for groceries and rent.",
      "The operational pain is reconciliation: matching references in email, screenshots in WhatsApp, and a spreadsheet of who still owes for last week’s delivered meals.",
      "MealHQ lets consumers submit a reference (and optional screenshot). Providers verify or reject. Outstanding is delivered meals × unit price (plus optional GST/HST) minus verified payments — so the books stay inspectable.",
    ],
  },
  {
    slug: "weekly-meal-schedule-for-subscribers",
    title: "Building a weekly meal schedule for multi-day subscribers",
    description: "Weekday tiffin quantities, same-every-day vs custom schedules, and how delivery snapshots keep prices honest.",
    date: "2026-07-02",
    paragraphs: [
      "Subscription tiffins rarely mean “one box every day.” Many kitchens deliver Monday–Friday with two boxes on Wednesdays, or skip Sundays entirely.",
      "MealHQ stores a weekday → quantity map on each customer. Generation creates one stop per day with a snapped quantity and meal price so later schedule edits do not rewrite history.",
      "Consumers can adjust which days they receive (new days default to quantity 1); providers keep full control of per-day counts.",
    ],
  },
  {
    slug: "gta-delivery-route-tips",
    title: "Delivery route tips for GTA condo postal codes",
    description: "Practical routing ideas for Toronto–Mississauga tiffin kitchens using FSA awareness and delivery sequence.",
    date: "2026-07-03",
    paragraphs: [
      "GTA routes fail when towers are visited out of order or apartment numbers are missing. Capture address, apartment, and postal code on every customer.",
      "MealHQ sorts by route order, then FSA, then name — and seeds route order from each customer’s delivery sequence when assigned to a driver.",
      "Drivers get Maps links per stop; admins can reorder the day’s list when traffic or building access changes.",
    ],
  },
  {
    slug: "gst-hst-homemade-meal-businesses",
    title: "GST/HST notes for homemade meal businesses (not tax advice)",
    description: "How MealHQ’s optional tax rate works on outstanding — and why you should still talk to an accountant.",
    date: "2026-07-04",
    paragraphs: [
      "Whether your kitchen must charge GST/HST depends on registration thresholds and your situation. MealHQ is software, not a tax advisor.",
      "If you do charge tax, MealHQ can apply a tax_rate_percent as an add-on on delivered meal line amounts when computing outstanding and statements.",
      "Confirm with a Canadian accountant before you change rates or issue statements to customers.",
    ],
  },
  {
    slug: "pause-resume-meal-subscriptions",
    title: "Pause and resume meal subscriptions without spreadsheet chaos",
    description: "Vacation windows, paused delivery statuses, and restoring future stops when customers return.",
    date: "2026-07-05",
    paragraphs: [
      "Travel season wrecks handwritten lists. MealHQ pause windows mark generated deliveries as paused for those dates.",
      "When you resume, future paused stops can return to pending so the route fills in again without recreating the customer.",
      "Pair pauses with clear consumer communication — they still see history and outstanding for meals already delivered.",
    ],
  },
  {
    slug: "driver-vs-owner-operator-routes",
    title: "Hiring a driver vs owner-operator routes",
    description: "When to stay solo, when to add a MealHQ driver role, and how role permissions keep money screens admin-only.",
    date: "2026-07-06",
    paragraphs: [
      "Many kitchens start owner-operated. When volume grows, a driver should mark deliveries without seeing CAD outstanding or payment approvals.",
      "MealHQ’s driver role lands on Deliveries; admins keep CRM, payments, and settings.",
      "Assign customers to a driver with a delivery sequence so today’s list mirrors the run you trained.",
    ],
  },
  {
    slug: "consumer-signup-codes-explained",
    title: "Consumer signup codes explained",
    description: "How families join a Canadian kitchen workspace with a provider code — and what pending approval means.",
    date: "2026-07-07",
    paragraphs: [
      "Each MealHQ kitchen has a signup code. Consumers enter it to attach to that tenant — not a global meal marketplace.",
      "Providers can require approval before deliveries generate, which protects routes from incomplete addresses.",
      "Invites and CRM imports help when you already know the customer email.",
    ],
  },
  {
    slug: "migrate-from-whatsapp-excel-to-mealhq",
    title: "Migrating from WhatsApp + Excel to MealHQ",
    description: "A practical cutover plan: import customers, share the code, run Interac verification in parallel for one week.",
    date: "2026-07-08",
    paragraphs: [
      "Export your spreadsheet columns into MealHQ’s CSV import (name, phone, address, days, meal price, quantity).",
      "Share the signup code so digital-native customers create accounts; keep Interac instructions identical for week one.",
      "Mark deliveries in MealHQ while you still glance at the old sheet — then retire the sheet when outstanding matches reality.",
    ],
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function allPostSlugs(): string[] {
  return BLOG_POSTS.map((p) => p.slug);
}
