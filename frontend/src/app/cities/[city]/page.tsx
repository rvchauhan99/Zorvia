import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import MarketingShell from "@/components/MarketingShell";
import { CITIES, allCitySlugs, getCity } from "@/lib/seo-cities";

type Props = { params: Promise<{ city: string }> };

export function generateStaticParams() {
  return allCitySlugs().map((city) => ({ city }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: slug } = await params;
  const city = getCity(slug);
  if (!city) return { title: "City" };
  return {
    title: `${city.name} tiffin software`,
    description: city.intro.slice(0, 155),
    alternates: { canonical: `/cities/${city.slug}` },
  };
}

export default async function CityPage({ params }: Props) {
  const { city: slug } = await params;
  const city = getCity(slug);
  if (!city) notFound();

  return (
    <MarketingShell testid={`city-${city.slug}`}>
      <article className="max-w-3xl mx-auto">
        <span className="label-overline">
          {city.name} · {city.province}
        </span>
        <h1 className="font-display font-black text-4xl sm:text-5xl mt-2 tracking-tight">{city.headline}</h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{city.intro}</p>

        <h2 className="font-display font-bold text-2xl mt-10">Local operations notes</h2>
        <ul className="mt-4 space-y-3 list-disc pl-5 text-muted-foreground leading-relaxed">
          {city.localNotes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>

        <p className="mt-6 text-muted-foreground">
          Common service areas: <span className="text-foreground">{city.neighborhoods}</span>.
        </p>

        <h2 className="font-display font-bold text-2xl mt-10">Other Canadian cities</h2>
        <ul className="mt-3 flex flex-wrap gap-3 text-sm">
          {CITIES.filter((c) => c.slug !== city.slug).map((c) => (
            <li key={c.slug}>
              <Link href={`/cities/${c.slug}`} className="text-primary font-medium hover:underline">
                {c.name}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/signup" className="pill-btn btn-primary h-12 px-6">
            Start free in {city.name}
          </Link>
          <Link href="/tiffin-software-canada" className="pill-btn btn-outline h-12 px-6">
            Canada overview
          </Link>
        </div>
      </article>
    </MarketingShell>
  );
}
