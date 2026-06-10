"use client";

import { ParticleTextEffect } from "@/shared/ui/particle-text-effect";
import { Typewriter } from "@/shared/ui/typewriter";
import { Card } from "@/shared/ui/card";
import { BackButton } from "@/shared/ui/back-button";
import { motion } from "framer-motion";

const privacySections = [
  {
    title: "Information We Collect",
    content: "We collect account information (name, email, role), learning activity (sessions, quests, XP, progress), and operational data (device/browser metadata, logs, and security signals). Payment details are processed by Stripe and are not stored on Mentrixa servers."
  },
  {
    title: "How We Use Information",
    content: "We use data to provide tutoring and learning features, secure the platform, support users, improve performance, and generate aggregated analytics for product quality and reliability."
  },
  {
    title: "Children and Student Data",
    content: "Mentrixa requires age confirmation at signup. For student-related data, we apply least-privilege access, role-based controls, and deletion workflows. Recording uploads require explicit consent confirmation."
  },
  {
    title: "Cookies and Analytics",
    content: "We use essential cookies for authentication and security. We may use limited product analytics to understand feature usage and reliability. Users in EEA/UK locales are shown a consent banner for analytics-related cookies."
  },
  {
    title: "Data Sharing",
    content: "We share data only with service providers needed to run Mentrixa, such as infrastructure, authentication, email, payments, observability, and AI services. These providers are contractually restricted to service delivery and security obligations."
  },
  {
    title: "Retention and Deletion",
    content: "We retain data only as long as needed for service delivery, legal obligations, and fraud prevention. Users can request deletion of their own data from account settings or by contacting support."
  }
];

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto py-20 px-6 space-y-12 relative">
      <div className="fixed top-20 left-6 z-50">
        <BackButton />
      </div>

      <header className="space-y-8 flex flex-col items-center text-center">
        <div className="h-24 w-full flex justify-center">
          <ParticleTextEffect words={["PRIVACY", "POLICY", "PROTECTION"]} className="w-full h-full" />
        </div>
        
        <div className="flex items-center gap-2 text-slate-400 font-mono text-xs uppercase tracking-widest">
          <span>Last updated:</span>
          <Typewriter 
            text={["April 2, 2026", "Updated for safety"]} 
            initialDelay={3000}
            className="text-blue-400"
          />
        </div>
      </header>

      <div className="grid gap-6">
        {privacySections.map((section, idx) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className="p-8 bg-slate-900/40 border-white/5 backdrop-blur-md">
              <h2 className="text-xl font-bold text-white mb-4 tracking-tight flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                {section.title}
              </h2>
              <p className="text-slate-400 leading-relaxed text-sm">
                {section.content}
              </p>
            </Card>
          </motion.div>
        ))}
      </div>

      <section className="p-8 rounded-3xl border border-dashed border-white/10 bg-white/5 text-center">
        <h2 className="text-xl font-bold text-white mb-4">Contact</h2>
        <p className="text-slate-400 text-sm">
          For privacy questions or deletion requests, contact{" "}
          <a className="text-blue-400 hover:underline font-bold" href="mailto:privacy@mentrixa.one">
            privacy@mentrixa.one
          </a>.
        </p>
      </section>
    </div>
  );
}

