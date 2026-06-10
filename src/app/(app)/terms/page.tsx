"use client";

import { ParticleTextEffect } from "@/shared/ui/particle-text-effect";
import { Typewriter } from "@/shared/ui/typewriter";
import { Card } from "@/shared/ui/card";
import { BackButton } from "@/shared/ui/back-button";
import { motion } from "framer-motion";

const termsSections = [
  {
    title: "Use of Service",
    content: "Mentrixa provides learning and tutoring tools. You agree to use the platform lawfully, provide accurate account information, and keep your credentials secure."
  },
  {
    title: "Roles and Access",
    content: "Access is role-based (student, tutor, admin). You may not attempt to bypass authorization controls, impersonate other users, or interfere with platform integrity."
  },
  {
    title: "Payments and Billing",
    content: "Paid services are processed by Stripe. By purchasing, you authorize applicable charges. Refund eligibility is governed by Mentrixa policy and applicable law."
  },
  {
    title: "Acceptable Use",
    content: "You must not upload malicious content, abuse AI tools, scrape protected data, or use the service for fraud, harassment, or other prohibited behavior. Violations may result in suspension or termination."
  },
  {
    title: "Intellectual Property",
    content: "Mentrixa and its content are protected by intellectual property laws. You retain rights to your submissions while granting us rights necessary to operate and improve the service."
  },
  {
    title: "Disclaimer and Liability",
    content: "The service is provided on an \"as is\" basis. To the maximum extent permitted by law, Mentrixa disclaims implied warranties and limits liability for indirect or consequential damages."
  }
];

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto py-20 px-6 space-y-12 relative">
      <div className="fixed top-20 left-6 z-50">
        <BackButton />
      </div>

      <header className="space-y-8 flex flex-col items-center text-center">
        <div className="h-24 w-full flex justify-center">
          <ParticleTextEffect words={["TERMS", "SERVICE", "MASTERY"]} className="w-full h-full" />
        </div>
        
        <div className="flex items-center gap-2 text-slate-400 font-mono text-xs uppercase tracking-widest">
          <span>Last updated:</span>
          <Typewriter 
            text={["April 2, 2026", "Legal clarity"]} 
            initialDelay={3000}
            className="text-emerald-400"
          />
        </div>
      </header>

      <div className="grid gap-6">
        {termsSections.map((section, idx) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className="p-8 bg-slate-900/40 border-white/5 backdrop-blur-md">
              <h2 className="text-xl font-bold text-white mb-4 tracking-tight flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
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
          For legal notices and terms questions, contact{" "}
          <a className="text-emerald-400 hover:underline font-bold" href="mailto:legal@mentrixa.one">
            legal@mentrixa.one
          </a>.
        </p>
      </section>
    </div>
  );
}

