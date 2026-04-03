import { z } from "zod";

export const userRoleSchema = z.enum(["student", "tutor"]);

export const signUpClientSchema = z
  .object({
    email: z.string().email().max(255).trim().toLowerCase(),
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
    role: userRoleSchema,
    ageConfirmed: z.literal(true),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const signUpServerSchema = z.object({
  email: z.string().email().max(255).trim().toLowerCase(),
  password: z.string().min(8).max(128),
  role: userRoleSchema,
  ageConfirmed: z.literal(true),
});

export const resolveDifficultySchema = z.enum([
  "no_idea",
  "concept_but_stuck",
  "minor_confusion",
]);

export const resolveIntakeSchema = z.object({
  subject: z.string().trim().min(2).max(120),
  problemText: z.string().trim().min(12).max(8000),
  difficulty: resolveDifficultySchema,
  bookTutorIfAiFails: z.boolean().optional().default(false),
});

export const recordingConsentSchema = z.object({
  recordingConsentConfirmed: z.literal(true),
});
