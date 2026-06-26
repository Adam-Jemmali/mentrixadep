"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { submitContactFeedback } from "@/features/marketing/contact";
import { Button } from "@/shared/ui/button";
import { MentrixaContactCategoryRadioGroup } from "@/shared/ui/radio-group-patterns";
import {
  MentrixaFieldset,
  MentrixaForm,
  MentrixaFormField,
} from "@/shared/ui/form-patterns";
import {
  contactFormFieldMessage,
  contactFormFieldsetMessage,
  validateEmailAddress,
  validateRequiredText,
} from "@/shared/ui/form-messages-pure";
import { ContactSocialLinks } from "@/features/marketing/contact-ui/contact-social-links";
import { gmailWebComposeUrl } from "@/features/marketing/mentrixa-brand";
import { Mail } from "lucide-react";

type Props = {
  /** Shown in mailto — should match where `CONTACT_INBOX_EMAIL` delivers. */
  feedbackEmail: string;
};

export function ContactPageClient({ feedbackEmail }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = e.currentTarget;
    const hp = new FormData(form).get("website");
    if (hp != null && String(hp).trim() !== "") {
      setPending(false);
      setDone(true);
      return;
    }
    const fd = new FormData(form);
    const result = await submitContactFeedback(fd);
    setPending(false);
    if (result.ok) {
      setDone(true);
      form.reset();
    } else {
      setError(result.error);
    }
  }, []);

  if (done) {
    return (
      <div className="lp-root">
        <div className="mx-auto mb-6 flex w-full max-w-2xl items-center justify-between rounded-2xl border border-white/15 bg-white/5 px-4 py-3 backdrop-blur-sm">
          <span className="text-sm font-semibold tracking-wide text-slate-100">Mentrixa Contact</span>
          <Link href="/" className="text-sm font-medium text-indigo-200 hover:text-indigo-100">
            Back to homepage
          </Link>
        </div>
        <section className="lp-band-contact py-12 md:py-16">
          <div className="max-w-lg mx-auto text-center py-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600">
              <Mail className="h-7 w-7" aria-hidden />
            </div>
            <h2 className="text-xl font-bold tracking-[-0.03em] text-slate-900">Thanks — we read every message</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              If you asked for a reply, we&apos;ll get back as soon as we can. Your feedback helps Mentrixa serve Mentrixers
              and Guides better.
            </p>
            <Button type="button" variant="outline" className="mt-2" onClick={() => setDone(false)}>
              Send another message
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="lp-root">
      <div className="mx-auto mb-6 flex w-full max-w-2xl items-center justify-between rounded-2xl border border-white/15 bg-white/5 px-4 py-3 backdrop-blur-sm">
        <span className="text-sm font-semibold tracking-wide text-slate-100">Mentrixa Contact</span>
        <Link href="/" className="text-sm font-medium text-indigo-200 hover:text-indigo-100">
          Back to homepage
        </Link>
      </div>
      <section className="lp-band-contact py-12 md:py-16">
        <div className="max-w-2xl mx-auto space-y-10 pb-12 px-4 sm:px-6">
      <div className="space-y-3 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Contact</p>
        <h1 className="text-3xl font-bold tracking-[-0.04em] text-white md:text-4xl">Talk to us</h1>
        <p className="text-base text-slate-200 leading-relaxed max-w-xl">
          You&apos;re the reason we ship. Mentrixers and Guides who speak up shape what we are building.
        </p>
        <p className="text-sm font-medium text-slate-100">
          Prefer email?{" "}
          <a
            href={gmailWebComposeUrl(feedbackEmail)}
            target="_blank"
            rel="noopener noreferrer"
            title="Compose in Gmail (web)"
            className="text-indigo-300 underline underline-offset-2 hover:text-indigo-200 break-all"
          >
            {feedbackEmail}
          </a>
        </p>
      </div>

      

      <MentrixaForm
        onSubmit={onSubmit}
        tone="light"
        className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm md:p-8"
      >
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

        <MentrixaFieldset
          legend="Send feedback"
          description="Pick a category and tell us what to fix or build next."
          tone="light"
          message={contactFormFieldsetMessage()}
          actions={
            <div className="flex flex-wrap items-center gap-4">
              <Button type="submit" className="min-w-[160px]" disabled={pending}>
                {pending ? "Sending…" : "Send feedback"}
              </Button>
              <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-black hover:text-black/80">
                <span className="inline-flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-black/5">
                  <Image src="/mentrixalogo/logo.webp" alt="Mentrixa" width={45} height={45} />
                </span>
                Return to homepage
              </Link>
            </div>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <MentrixaFormField
              label="Name"
              name="name"
              isRequired
              placeholder="Your name"
              autoComplete="name"
              validate={(value) => validateRequiredText(value, "Name")}
              message={contactFormFieldMessage("name")}
            />
            <MentrixaFormField
              label="Email"
              name="email"
              type="email"
              isRequired
              placeholder="you@example.com"
              autoComplete="email"
              validate={validateEmailAddress}
              message={contactFormFieldMessage("email")}
            />
          </div>

          <MentrixaContactCategoryRadioGroup />

          <MentrixaFormField
            label="Your message"
            name="message"
            multiline
            rows={6}
            isRequired
            placeholder="Share feedback, ideas, or what we should fix. The more specific, the faster we can help."
            validate={(value) => validateRequiredText(value, "Message")}
            message={contactFormFieldMessage("message")}
          />

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
        </MentrixaFieldset>
      </MentrixaForm>


      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/80 p-6 shadow-sm md:p-8">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Hang out with Mentrixa</h2>
        <ContactSocialLinks />
      </div>
        </div>
      </section>
    </div>
  );
}
