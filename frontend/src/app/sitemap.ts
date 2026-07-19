import type { MetadataRoute } from "next";

const SITE = "https://www.mealhq.ca";

/** Marketing URLs indexed for Canada-first SEO. */
const paths: { path: string; changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"]; priority: number }[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/about", changeFrequency: "monthly", priority: 0.8 },
  { path: "/pricing", changeFrequency: "weekly", priority: 0.9 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.8 },
  { path: "/for-tiffin-providers", changeFrequency: "weekly", priority: 0.95 },
  { path: "/tiffin-software-canada", changeFrequency: "weekly", priority: 0.95 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.7 },
  { path: "/cities/toronto", changeFrequency: "monthly", priority: 0.7 },
  { path: "/cities/vancouver", changeFrequency: "monthly", priority: 0.7 },
  { path: "/cities/calgary", changeFrequency: "monthly", priority: 0.7 },
  { path: "/cities/edmonton", changeFrequency: "monthly", priority: 0.7 },
  { path: "/cities/ottawa", changeFrequency: "monthly", priority: 0.7 },
  { path: "/cities/mississauga", changeFrequency: "monthly", priority: 0.7 },
  // Blog posts
  { path: "/blog/interac-payments-for-tiffin-businesses", changeFrequency: "monthly", priority: 0.6 },
  { path: "/blog/weekly-meal-schedule-for-subscribers", changeFrequency: "monthly", priority: 0.6 },
  { path: "/blog/gta-delivery-route-tips", changeFrequency: "monthly", priority: 0.6 },
  { path: "/blog/gst-hst-homemade-meal-businesses", changeFrequency: "monthly", priority: 0.6 },
  { path: "/blog/pause-resume-meal-subscriptions", changeFrequency: "monthly", priority: 0.6 },
  { path: "/blog/driver-vs-owner-operator-routes", changeFrequency: "monthly", priority: 0.6 },
  { path: "/blog/consumer-signup-codes-explained", changeFrequency: "monthly", priority: 0.6 },
  { path: "/blog/migrate-from-whatsapp-excel-to-mealhq", changeFrequency: "monthly", priority: 0.6 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return paths.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE}${path === "/" ? "" : path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
