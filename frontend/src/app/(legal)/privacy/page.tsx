import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy · MealHQ",
  description: "How MealHQ collects, uses, and protects personal information for Canadian tiffin providers and their customers.",
};

const UPDATED = "July 16, 2026";

export default function PrivacyPage() {
  return (
    <article className="max-w-3xl mx-auto" data-testid="privacy-page">
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-10">Last updated: {UPDATED}</p>

      <div className="space-y-8 text-base sm:text-[17px] leading-relaxed text-foreground/90">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Who we are</h2>
          <p>
            MealHQ (“we”, “us”) provides multi-tenant software for Canadian tiffin and meal-delivery providers and
            their customers. This policy describes how we handle personal information when you use mealhq.ca and related
            apps or APIs.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">What we collect</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Account data:</strong> name, email, password (stored hashed), role (provider staff or consumer),
              and organisation details you provide at signup.
            </li>
            <li>
              <strong>Google Sign-In:</strong> if you choose Google, we receive your Google account email and display
              name (and a stable Google user id) to create or link your MealHQ account.
            </li>
            <li>
              <strong>Operations data:</strong> delivery schedules, addresses/postal areas, meal status, outstanding
              balances, and Interac e-Transfer payment references or screenshots you or your provider submit.
            </li>
            <li>
              <strong>Support:</strong> messages you send via our contact form or email, including your reply address.
            </li>
            <li>
              <strong>Technical:</strong> basic logs (IP, timestamps, error diagnostics) needed to run and secure the
              service.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">How we use information</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Provide authentication, delivery lists, payments reconciliation, and reporting.</li>
            <li>Send transactional email (verification codes, invites, payment notices) when email is configured.</li>
            <li>Respond to support requests and improve reliability and security.</li>
            <li>Comply with law and enforce our Terms of Service.</li>
          </ul>
          <p className="mt-3">We do not sell personal information.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Providers and tenant data</h2>
          <p>
            MealHQ is multi-tenant. Each provider’s workspace is isolated. Customer and delivery data entered under a
            provider belongs to that provider’s operations. We process that data to run the product for them; providers
            are responsible for how they use customer information in their business.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Sharing and processors</h2>
          <p className="mb-3">We share data only as needed to operate MealHQ, including:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Hosting and infrastructure providers (e.g. application hosting, database).</li>
            <li>Firebase / Google for optional Google Sign-In and related auth.</li>
            <li>Email delivery providers (e.g. Resend) when configured.</li>
            <li>Object storage for images (e.g. logos, payment screenshots) when configured.</li>
          </ul>
          <p className="mt-3">
            We may disclose information if required by law or to protect the rights, safety, and integrity of MealHQ and
            our users.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Retention</h2>
          <p>
            We retain account and operations data while your account or provider workspace is active and for a
            reasonable period afterward for backups, disputes, and legal obligations. You may request deletion subject
            to those needs and your provider’s data requirements.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Security</h2>
          <p>
            We use industry-standard practices such as encrypted transport (HTTPS), hashed passwords, and tenant-scoped
            access controls. No method of transmission or storage is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Your choices and rights</h2>
          <p>
            Depending on applicable Canadian privacy law, you may request access to or correction of personal
            information we hold about you, or ask us to delete it where appropriate. Contact us using the addresses
            below. If you are a consumer on a provider’s workspace, some requests may need to go through that provider.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Contact</h2>
          <p>
            Privacy questions:{" "}
            <a className="text-primary font-medium hover:underline" href="mailto:ravatrajsinh@gmail.com">
              ravatrajsinh@gmail.com
            </a>
            {" · "}
            <a className="text-primary font-medium hover:underline" href="mailto:khamarvedang04@gmail.com">
              khamarvedang04@gmail.com
            </a>
          </p>
          <p className="mt-2">
            Or use the{" "}
            <a className="text-primary font-medium hover:underline" href="/#contact">
              contact form
            </a>{" "}
            on mealhq.ca.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Changes</h2>
          <p>
            We may update this policy from time to time. The “Last updated” date at the top will change when we do. Continued
            use of MealHQ after an update means you accept the revised policy.
          </p>
        </section>
      </div>
    </article>
  );
}
