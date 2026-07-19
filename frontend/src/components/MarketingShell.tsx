import Link from "next/link";
import Image from "next/image";

const CONTACT_EMAILS = [
  "khamarvedang04@gmail.com",
  "ravatrajsinh@gmail.com",
] as const;

const shell = "mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-10";

const nav = [
  { href: "/for-tiffin-providers", label: "For providers" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
];

export default function MarketingShell({
  children,
  testid = "marketing-page",
}: {
  children: React.ReactNode;
  testid?: string;
}) {
  return (
    <div className="min-h-screen bg-brand-cream text-foreground flex flex-col" data-testid={testid}>
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-brand-cream/85 border-b border-brand-border">
        <div className={`${shell} flex items-center justify-between py-3 sm:py-4 gap-3`}>
          <Link href="/" className="inline-flex items-center shrink-0">
            <Image
              src="/brand/mealhq-logo-horizontal.png"
              alt="MealHQ"
              width={200}
              height={64}
              className="h-12 sm:h-16 w-auto"
            />
          </Link>
          <nav className="flex items-center gap-3 sm:gap-5 text-sm sm:text-base flex-wrap justify-end">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="hidden sm:inline hover:text-primary transition-colors">
                {n.label}
              </Link>
            ))}
            <Link href="/login" className="pill-btn btn-outline text-sm h-10 px-4">
              Log in
            </Link>
            <Link href="/signup" className="pill-btn btn-primary text-sm h-10 px-4">
              Start free
            </Link>
          </nav>
        </div>
      </header>

      <main className={`${shell} flex-1 py-10 sm:py-14 lg:py-16`}>{children}</main>

      <footer className="border-t border-brand-border py-8 lg:py-10 mt-auto">
        <div className={`${shell} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <Link href="/pricing" className="hover:text-primary transition-colors">Pricing</Link>
            <Link href="/faq" className="hover:text-primary transition-colors">FAQ</Link>
            <Link href="/blog" className="hover:text-primary transition-colors">Blog</Link>
            <Link href="/cities/toronto" className="hover:text-primary transition-colors">Toronto</Link>
            <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {CONTACT_EMAILS.map((email) => (
              <a key={email} href={`mailto:${email}`} className="font-medium hover:text-primary transition-colors">
                {email}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
