"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { submitContactFeedback } from "@/features/marketing/contact";
import { MentrixaLogoMark } from "@/components/mentrixa-logo";
import { MentrixaWordmark } from "@/components/mentrixa-wordmark";
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
import { DEFAULT_PUBLIC_FEEDBACK_EMAIL, gmailWebComposeUrl } from "@/features/marketing/mentrixa-brand";
import { LandingStickyCard } from "@/features/marketing/landing/ui/landing-section-shell";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";

type Props = {
  feedbackEmail?: string;
};

export function ContactPageClient({ feedbackEmail = DEFAULT_PUBLIC_FEEDBACK_EMAIL }: Props) {
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

  return (
    <div className="relative z-10 mx-auto max-w-2xl px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
      <LandingStickyCard
        variant="clip"
        rotate={false}
        className="mb-8 flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"
      >
        <Link href="/" prefetch={false} className="flex items-center gap-2">
          <MentrixaLogoMark size="sm" className="shrink-0 opacity-95" />
          <MentrixaWordmark className="text-base sm:text-lg" />
        </Link>
        <Link href="/" prefetch={false} className={landingHub.linkBack}>
          Back home
        </Link>
      </LandingStickyCard>

      {done ? (
        <LandingStickyCard variant="pinned" className="text-center rotate-[0.2deg] px-5 py-8 sm:px-7">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">
            <Mail className="h-7 w-7" aria-hidden />
          </div>
          <h1 className={landingHub.title}>Thanks. We read every message.</h1>
          <p className={`mx-auto mt-3 max-w-md ${landingHub.body}`}>
            If you asked for a reply, we&apos;ll get back as soon as we can. Your feedback shapes what we ship next.
          </p>
          <Button type="button" variant="outline" className="mt-6" onClick={() => setDone(false)}>
            Send another message
          </Button>
        </LandingStickyCard>
      ) : (
        <>
          <LandingStickyCard variant="taped" className="mb-6 text-center rotate-[-0.3deg] px-5 py-7 sm:px-7">
            <p className={landingHub.eyebrow}>Contact</p>
            <h1 className={`mt-2 ${landingHub.title}`}>Talk to us</h1>
            <p className={`mx-auto mt-3 max-w-lg ${landingHub.body}`}>
              Mentrixers and Guides who speak up shape what we build. Pick a category and tell us what to fix or ship
              next.
            </p>
            <p className={`mt-4 ${landingHub.bodySm}`}>
              Prefer email?{" "}
              <a
                href={gmailWebComposeUrl(feedbackEmail)}
                target="_blank"
                rel="noopener noreferrer"
                title="Compose in Gmail (web)"
                className="font-semibold text-[#4F46E5] underline underline-offset-2 hover:text-[#0B1220]"
              >
                {feedbackEmail}
              </a>
            </p>
          </LandingStickyCard>

          <LandingStickyCard variant="curl" className="mb-6 rotate-[0.35deg]">
            <MentrixaForm onSubmit={onSubmit} tone="light" className="space-y-0 bg-transparent p-0 shadow-none">
              <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

              <MentrixaFieldset
                legend="Send feedback"
                description="Name, email, category, and your message."
                tone="light"
                message={contactFormFieldsetMessage()}
                actions={
                  <Button type="submit" className="min-w-[160px]" disabled={pending}>
                    {pending ? "Sending…" : "Send feedback"}
                  </Button>
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
          </LandingStickyCard>

          <LandingStickyCard variant="clip" className="rotate-[-0.2deg] px-5 py-6 sm:px-7">
            <h2 className="text-lg font-bold text-[#0B1220]">Hang out with us</h2>
            <p className={`mt-2 ${landingHub.bodySm}`}>Follow along while we ship.</p>
            <div className="mt-4">
              <ContactSocialLinks />
            </div>
          </LandingStickyCard>
        </>
      )}

      <LandingStickyCard variant="pinned" className="mt-6 text-center rotate-[0.15deg] px-5 py-5">
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-semibold text-[#475569]">
          <Link href="/privacy" className="hover:text-[#0B1220]">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-[#0B1220]">
            Terms
          </Link>
          <Link href="/contact" className="text-[#4F46E5] hover:text-[#0B1220]">
            Contact
          </Link>
        </nav>
      </LandingStickyCard>
    </div>
  );
}
