"use server";

import { z } from "zod";
import { sendContactFeedbackInbound } from "@/lib/email";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  email: z.string().trim().email("Enter a valid email."),
  category: z.enum(["feedback", "bug", "billing", "partnership", "other"]),
  message: z.string().trim().min(10, "Tell us a bit more (at least 10 characters).").max(8000),
});

const categoryLabel: Record<z.infer<typeof schema>["category"], string> = {
  feedback: "Product feedback & ideas",
  bug: "Bug report",
  billing: "Billing & payments",
  partnership: "Partnership / press",
  other: "Other",
};

export type ContactFeedbackState =
  | { ok: true }
  | { ok: false; error: string };

export async function submitContactFeedback(formData: FormData): Promise<ContactFeedbackState> {
  const website = formData.get("website");
  if (website != null && String(website).trim() !== "") {
    return { ok: true };
  }

  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    category: formData.get("category"),
    message: formData.get("message"),
    website: formData.get("website"),
  });

  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg =
      first.name?.[0] ??
      first.email?.[0] ??
      first.category?.[0] ??
      first.message?.[0] ??
      "Please check your input.";
    return { ok: false, error: msg };
  }

  const { name, email, category, message } = parsed.data;
  const result = await sendContactFeedbackInbound({
    fromName: name,
    fromEmail: email,
    category: categoryLabel[category],
    message,
  });

  if (!result.ok) {
    return { ok: false, error: result.error ?? "Something went wrong." };
  }
  return { ok: true };
}
