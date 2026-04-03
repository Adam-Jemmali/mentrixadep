export const metadata = {
  title: "Privacy · Mentrixa",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto py-10 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-[-0.03em] text-slate-900">Privacy Policy</h1>
        <p className="text-sm text-slate-500">Last updated: April 2, 2026</p>
      </header>

      <section className="space-y-2 text-sm text-slate-700">
        <h2 className="text-base font-semibold text-slate-900">Information We Collect</h2>
        <p>
          We collect account information (name, email, role), learning activity (sessions, quests, XP, progress), and
          operational data (device/browser metadata, logs, and security signals). Payment details are processed by
          Stripe and are not stored on Mentrixa servers.
        </p>
      </section>

      <section className="space-y-2 text-sm text-slate-700">
        <h2 className="text-base font-semibold text-slate-900">How We Use Information</h2>
        <p>
          We use data to provide tutoring and learning features, secure the platform, support users, improve
          performance, and generate aggregated analytics for product quality and reliability.
        </p>
      </section>

      <section className="space-y-2 text-sm text-slate-700">
        <h2 className="text-base font-semibold text-slate-900">Children and Student Data</h2>
        <p>
          Mentrixa requires age confirmation at signup. For student-related data, we apply least-privilege access,
          role-based controls, and deletion workflows. Recording uploads require explicit consent confirmation.
        </p>
      </section>

      <section className="space-y-2 text-sm text-slate-700">
        <h2 className="text-base font-semibold text-slate-900">Cookies and Analytics</h2>
        <p>
          We use essential cookies for authentication and security. We may use limited product analytics to understand
          feature usage and reliability. Users in EEA/UK locales are shown a consent banner for analytics-related
          cookies.
        </p>
      </section>

      <section className="space-y-2 text-sm text-slate-700">
        <h2 className="text-base font-semibold text-slate-900">Data Sharing</h2>
        <p>
          We share data only with service providers needed to run Mentrixa, such as infrastructure, authentication,
          email, payments, observability, and AI services. These providers are contractually restricted to service
          delivery and security obligations.
        </p>
      </section>

      <section className="space-y-2 text-sm text-slate-700">
        <h2 className="text-base font-semibold text-slate-900">Retention and Deletion</h2>
        <p>
          We retain data only as long as needed for service delivery, legal obligations, and fraud prevention. Users
          can request deletion of their own data from account settings or by contacting support.
        </p>
      </section>

      <section className="space-y-2 text-sm text-slate-700">
        <h2 className="text-base font-semibold text-slate-900">Contact</h2>
        <p>
          For privacy questions or deletion requests, contact <a className="underline" href="mailto:privacy@mentrixa.com">privacy@mentrixa.com</a>.
        </p>
      </section>
    </div>
  );
}

