import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service · MealHQ",
  description: "Terms governing use of the MealHQ platform for Canadian tiffin providers and consumers.",
};

const UPDATED = "July 16, 2026";

export default function TermsPage() {
  return (
    <article className="max-w-3xl mx-auto" data-testid="terms-page">
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-2">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-10">Last updated: {UPDATED}</p>

      <div className="space-y-8 text-base sm:text-[17px] leading-relaxed text-foreground/90">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Agreement</h2>
          <p>
            By accessing or using MealHQ (the “Service”) at mealhq.ca or related applications, you agree to these Terms
            of Service and our{" "}
            <a className="text-primary font-medium hover:underline" href="/privacy">
              Privacy Policy
            </a>
            . If you use the Service on behalf of an organisation, you represent that you have authority to bind that
            organisation.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">The Service</h2>
          <p>
            MealHQ is software for tiffin and meal-delivery providers and their customers: scheduling and delivery
            lists, customer management, Interac e-Transfer payment verification workflows, outstanding balances, and
            related reporting. Features may change as we improve the product. Some integrations (email, storage, Google
            Sign-In, card billing) only work when configured.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Accounts</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>You must provide accurate account information and keep credentials secure.</li>
            <li>Provider workspaces are tenant-isolated; you may only access data for tenants you are authorised to use.</li>
            <li>You are responsible for activity under your account and for staff you invite.</li>
            <li>We may suspend or terminate accounts that abuse the Service or violate these Terms.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Acceptable use</h2>
          <p className="mb-3">You agree not to:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Use the Service for unlawful purposes or to harass others.</li>
            <li>Attempt to access other tenants’ data, probe systems without permission, or disrupt the Service.</li>
            <li>Upload malware or content you do not have rights to use.</li>
            <li>Misrepresent payment references or other operational records.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Subscriptions and billing</h2>
          <p>
            Provider plans, trials, and pricing (typically in CAD) are described in-product. Where self-serve activation
            or third-party checkout (e.g. Stripe) is enabled, those flows and any stated fees apply. Unpaid or expired
            subscriptions may limit access to provider features. Consumer use of a provider’s workspace does not create
            a separate MealHQ subscription unless we say otherwise.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Data ownership</h2>
          <p>
            Providers own the customer, delivery, and payment operational data they enter in their tenant. MealHQ owns
            the platform software, branding, and aggregated/non-identifying insights we may use to improve the Service.
            You grant us a licence to host and process your content solely to provide and secure MealHQ.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Third-party services</h2>
          <p>
            Google Sign-In, email, storage, and payment processors are provided by third parties under their own terms.
            MealHQ is not responsible for outages or policy changes of those services.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Disclaimer</h2>
          <p>
            The Service is provided “as is” and “as available” without warranties of any kind, express or implied,
            including fitness for a particular purpose and non-infringement, to the fullest extent permitted by law.
            MealHQ is an operations tool; it does not replace your food-safety, employment, or tax obligations.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Limitation of liability</h2>
          <p>
            To the fullest extent permitted by applicable law, MealHQ and its operators will not be liable for indirect,
            incidental, special, consequential, or punitive damages, or for lost profits, data, or goodwill, arising
            from your use of the Service. Our aggregate liability for claims relating to the Service is limited to the
            fees you paid us for the Service in the three months before the claim (or CAD $100 if you paid nothing).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Governing law</h2>
          <p>
            These Terms are governed by the laws of the Province of Ontario and the federal laws of Canada applicable
            therein, without regard to conflict-of-law rules. Courts in Ontario will have exclusive jurisdiction, subject
            to mandatory consumer protections that cannot be waived.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Contact</h2>
          <p>
            Questions about these Terms:{" "}
            <a className="text-primary font-medium hover:underline" href="mailto:ravatrajsinh@gmail.com">
              ravatrajsinh@gmail.com
            </a>
            {" · "}
            <a className="text-primary font-medium hover:underline" href="mailto:khamarvedang04@gmail.com">
              khamarvedang04@gmail.com
            </a>
            {" · "}
            <a className="text-primary font-medium hover:underline" href="/#contact">
              contact form
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Changes</h2>
          <p>
            We may update these Terms by posting a new version on this page. Material changes will update the “Last
            updated” date. Continued use after changes constitutes acceptance.
          </p>
        </section>
      </div>
    </article>
  );
}
