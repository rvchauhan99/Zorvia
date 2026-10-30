/** Shared JSON-LD helpers for MealHQ marketing pages. */

export const ORGANIZATION_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "MealHQ",
  url: "https://www.mealhq.ca",
  logo: "https://www.mealhq.ca/brand/mealhq-logo-horizontal.png",
  description:
    "MealHQ is management software for independent Canadian tiffin kitchens — customers, meal plans, routes, kitchen counts, Interac payments, and outstanding balances.",
  email: "ravatrajsinh@gmail.com",
  areaServed: {
    "@type": "Country",
    name: "Canada",
  },
  sameAs: [] as string[],
};

export const SOFTWARE_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "MealHQ",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: "https://www.mealhq.ca",
  description:
    "Tiffin business software for Canadian kitchens: customers, daily routes, kitchen counts, Interac e-Transfer reconciliation, meal schedules, and outstanding balances.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "CAD",
    description: "Free trial to open a kitchen workspace",
  },
  areaServed: "CA",
};

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const payload = Array.isArray(data) ? data : [data];
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload.length === 1 ? payload[0] : payload) }}
    />
  );
}
