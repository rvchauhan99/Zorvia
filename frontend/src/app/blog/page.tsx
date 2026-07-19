import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/components/MarketingShell";
import { BLOG_POSTS } from "@/lib/seo-blog";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Guides for Canadian tiffin kitchens — Interac payments, meal schedules, GTA routes, GST/HST notes, and migrating off spreadsheets.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndexPage() {
  return (
    <MarketingShell testid="blog-index">
      <div className="max-w-3xl mx-auto">
        <span className="label-overline">Guides</span>
        <h1 className="font-display font-black text-4xl sm:text-5xl mt-2">MealHQ blog</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Operator-first articles for Canadian tiffin businesses — not generic meal-kit marketing.
        </p>
        <ul className="mt-10 divide-y divide-brand-border">
          {BLOG_POSTS.map((p) => (
            <li key={p.slug} className="py-5">
              <Link href={`/blog/${p.slug}`} className="group block">
                <div className="text-xs text-muted-foreground">{p.date}</div>
                <h2 className="font-display font-bold text-xl mt-1 group-hover:text-primary transition-colors">
                  {p.title}
                </h2>
                <p className="mt-1 text-muted-foreground text-sm leading-relaxed">{p.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </MarketingShell>
  );
}
