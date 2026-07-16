import Link from "next/link";

const CONTACT_EMAILS = [
  "khamarvedang04@gmail.com",
  "ravatrajsinh@gmail.com",
] as const;

const shell = "mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-10";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-cream text-foreground flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-brand-cream/85 border-b border-brand-border">
        <div className={`${shell} flex items-center justify-between py-3 sm:py-4 gap-3`}>
          <Link href="/" className="inline-flex items-center shrink-0" data-testid="legal-brand">
            <img
              src="/brand/mealhq-logo-horizontal.png"
              alt="MealHQ"
              className="h-12 sm:h-16 w-auto"
            />
          </Link>
          <nav className="flex items-center gap-4 sm:gap-6 text-sm sm:text-base">
            <Link href="/privacy" className="hover:text-primary transition-colors" data-testid="legal-nav-privacy">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-primary transition-colors" data-testid="legal-nav-terms">
              Terms
            </Link>
            <Link href="/#contact" className="hover:text-primary transition-colors" data-testid="legal-nav-contact">
              Contact
            </Link>
          </nav>
        </div>
      </header>

      <main className={`${shell} flex-1 py-10 sm:py-14 lg:py-16`}>{children}</main>

      <footer className="border-t border-brand-border py-8 lg:py-10 mt-auto">
        <div className={`${shell} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-primary transition-colors">
              Terms of Service
            </Link>
            <Link href="/#contact" className="hover:text-primary transition-colors">
              Contact
            </Link>
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
