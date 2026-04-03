import { z } from "zod";

/** Monday = 0 … Sunday = 6 */
export const weekdayMon0Schema = z.number().int().min(0).max(6);

const timeHHmmSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5][0-9]$/, "Use HH:mm (24h)");

export const createAvailabilitySlotsSchema = z
  .object({
    course: z.string().min(1).max(200),
    weekdays: z.array(weekdayMon0Schema).min(1).max(7),
    startTime: timeHHmmSchema,
    endTime: timeHHmmSchema,
    recurring: z.boolean(),
    /** Used when recurring is true (default 12 on server). */
    recurringWeeks: z.number().int().min(1).max(52).optional(),
    priceUsd: z.number().positive().max(100_000),
    maxStudents: z.literal(1),
    timezone: z.string().min(1).max(120),
  })
  .superRefine((data, ctx) => {
    const [sh = 0, sm = 0] = data.startTime.split(":").map(Number);
    const [eh = 0, em = 0] = data.endTime.split(":").map(Number);
    if (sm % 30 !== 0 || em % 30 !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use 30-minute increments (:00 or :30)",
        path: ["startTime"],
      });
    }
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    if (endMin <= startMin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must be after start time",
        path: ["endTime"],
      });
    }
    const dur = endMin - startMin;
    if (dur < 15 || dur > 480) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Session length must be 15–480 minutes",
        path: ["endTime"],
      });
    }
    if (dur % 30 !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duration must be in 30-minute steps",
        path: ["endTime"],
      });
    }
  });

export type CreateAvailabilitySlotsInput = z.infer<typeof createAvailabilitySlotsSchema>;

export const availabilityIdSchema = z.string().uuid();

export const setAvailabilityActiveSchema = z.object({
  availabilityId: availabilityIdSchema,
  active: z.boolean(),
});
