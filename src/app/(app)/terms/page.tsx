export const metadata = {
  title: "Terms · Mentrixa",
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto py-10 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-[-0.03em] text-slate-900">Terms of Service</h1>
        <p className="text-sm text-slate-500">Last updated: April 2, 2026</p>
      </header>

      <section className="space-y-2 text-sm text-slate-700">
        <h2 className="text-base font-semibold text-slate-900">Use of Service</h2>
        <p>
          Mentrixa provides learning and tutoring tools. You agree to use the platform lawfully, provide accurate
          account information, and keep your credentials secure.
        </p>
      </section>

      <section className="space-y-2 text-sm text-slate-700">
        <h2 className="text-base font-semibold text-slate-900">Roles and Access</h2>
        <p>
          Access is role-based (student, tutor, admin). You may not attempt to bypass authorization controls, impersonate
          other users, or interfere with platform integrity.
        </p>
      </section>

      <section className="space-y-2 text-sm text-slate-700">
        <h2 className="text-base font-semibold text-slate-900">Payments and Billing</h2>
        <p>
          Paid services are processed by Stripe. By purchasing, you authorize applicable charges. Refund eligibility is
          governed by Mentrixa policy and applicable law.
        </p>
      </section>

      <section className="space-y-2 text-sm text-slate-700">
        <h2 className="text-base font-semibold text-slate-900">Acceptable Use</h2>
        <p>
          You must not upload malicious content, abuse AI tools, scrape protected data, or use the service for fraud,
          harassment, or other prohibited behavior. Violations may result in suspension or termination.
        </p>
      </section>

      <section className="space-y-2 text-sm text-slate-700">
        <h2 className="text-base font-semibold text-slate-900">Intellectual Property</h2>
        <p>
          Mentrixa and its content are protected by intellectual property laws. You retain rights to your submissions
          while granting us rights necessary to operate and improve the service.
        </p>
      </section>

      <section className="space-y-2 text-sm text-slate-700">
        <h2 className="text-base font-semibold text-slate-900">Disclaimer and Liability</h2>
        <p>
          The service is provided on an &quot;as is&quot; basis. To the maximum extent permitted by law, Mentrixa disclaims implied
          warranties and limits liability for indirect or consequential damages.
        </p>
      </section>

      <section className="space-y-2 text-sm text-slate-700">
        <h2 className="text-base font-semibold text-slate-900">Contact</h2>
        <p>
          For legal notices and terms questions, contact <a className="underline" href="mailto:legal@mentrixa.one">legal@mentrixa.one</a>.
        </p>
      </section>
    </div>
  );
}

