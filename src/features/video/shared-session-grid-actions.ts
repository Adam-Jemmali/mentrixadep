"use server";

import { z } from "zod";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { requireRole } from "@/shared/core/auth";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { isApCalculusAbSubject } from "@/features/quest/ap-calc-ab-subject";

const assignPracticeSchema = z.object({
  sessionId: z.string().uuid(),
  studentId: z.string().uuid(),
  skillNodeId: z.string().uuid(),
});

export async function assignSessionPracticeForNode(
  input: z.infer<typeof assignPracticeSchema>,
): Promise<
  | { success: true; questId: string; nodeId: string; nodeName: string }
  | { success: false; error: string }
> {
  try {
    const user = await requireRole(["tutor", "admin"]);
    const parsed = assignPracticeSchema.parse(input);
    const admin = createAdminClient();

    const { data: session, error: sessionError } = await admin
      .from("sessions")
      .select("student_id, tutor_id, course")
      .eq("id", parsed.sessionId)
      .maybeSingle();

    if (sessionError || !session) {
      return { success: false, error: "Session not found." };
    }

    if (String(session.student_id) !== parsed.studentId) {
      return { success: false, error: "Student does not match this session." };
    }

    if (user.role === "tutor" && String(session.tutor_id) !== user.id) {
      return { success: false, error: "Not your session." };
    }

    if (!isApCalculusAbSubject(String(session.course))) {
      return {
        success: false,
        error: "Only AP Calculus AB practice can be assigned in session.",
      };
    }

    const { data: nodeRow, error: nodeError } = await admin
      .from("skill_nodes")
      .select("id, node_name")
      .eq("id", parsed.skillNodeId)
      .eq("subject", AP_CALC_AB_SUBJECT)
      .maybeSingle();

    if (nodeError || !nodeRow) {
      return { success: false, error: "Skill node not found." };
    }

    const { selectItemBankQuestions, computePracticePackQuestionCount } =
      await import("@/features/quest/item-bank-selector");
    const { shufflePracticePackMcqOptions } = await import(
      "@/features/quest/practice-mcq-shuffle"
    );

    const questionCount = computePracticePackQuestionCount(6);
    const bankQuestions = await selectItemBankQuestions(
      parsed.studentId,
      AP_CALC_AB_SUBJECT,
      questionCount,
      {
        focusSkillNodeId: parsed.skillNodeId,
        difficulty: "intermediate",
      },
    );

    if (bankQuestions.length < questionCount) {
      return {
        success: false,
        error: "Not enough reviewed items for this node yet.",
      };
    }

    const questions = shufflePracticePackMcqOptions(bankQuestions);
    const timeLimitSec = 20 * 60;
    const meta = {
      questKind: "practice_pack",
      subject: AP_CALC_AB_SUBJECT,
      difficulty: "intermediate",
      packType: "mcq",
      packSource: "guide_session_assign",
      accountLevelTitle: "Mentrixer",
      questionCount: questions.length,
      timeLimitSec,
      course: AP_CALC_AB_SUBJECT,
      questions,
      mcqOptionsShuffled: true,
      assignedByGuideId: user.id,
      assignedInSessionId: parsed.sessionId,
      focusNodeName: nodeRow.node_name,
    };

    const title = `Guide pack: ${nodeRow.node_name}`;
    const { data: quest, error: insErr } = await admin
      .from("quests")
      .insert({
        creator_user_id: parsed.studentId,
        prompt: title,
        solution: "",
        metadata: meta as unknown as Record<string, unknown>,
      })
      .select("id")
      .single();

    if (insErr || !quest) {
      return { success: false, error: insErr?.message ?? "Could not save practice pack." };
    }

    await admin.from("user_quest_progress").upsert(
      {
        user_id: parsed.studentId,
        quest_id: quest.id,
        status: "in_progress",
        mode: "exam",
        num_attempts: 0,
      },
      { onConflict: "user_id,quest_id" },
    );

    return {
      success: true,
      questId: String(quest.id),
      nodeId: parsed.skillNodeId,
      nodeName: String(nodeRow.node_name),
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Could not assign practice.",
    };
  }
}
