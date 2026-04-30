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

export const userSettingsSchema = z.object({
  display_name: z.string().trim().max(100).nullable().optional(),
  bio: z.string().trim().max(280).nullable().optional(),
  profile_visible_to_tutors: z.boolean().optional(),
  avatar_url: z.string().trim().max(2048).url().nullable().optional(),
  timezone: z.string().max(64).optional(),
  email_session_reminders: z.boolean().optional(),
  email_session_booked: z.boolean().optional(),
  email_session_cancelled: z.boolean().optional(),
  email_weekly_summary: z.boolean().optional(),
  email_marketing: z.boolean().optional(),
  session_default_duration: z.number().int().min(15).max(480).optional(),
  session_buffer_minutes: z.number().int().min(0).max(120).optional(),
  focused_division_key: z.string().trim().max(64).nullable().optional(),
  duel_opt_in: z.boolean().optional(),
});
