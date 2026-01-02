"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function completePastSessions() {
  const supabase = await createClient();

  const { error } = await supabase.rpc("auto_complete_sessions");

  if (error) {
    throw new Error(`Failed to complete sessions: ${error.message}`);
  }

  return { success: true };
}

export async function markSessionComplete(sessionId: string) {
  const supabase = await createClient();

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    throw new Error("Session not found");
  }

  const sessionEnd = new Date(session.end_time);
  const now = new Date();

  if (sessionEnd > now) {
    throw new Error("Cannot complete session before end time");
  }

  if (session.completed) {
    return { success: true, alreadyCompleted: true };
  }

  const { error: updateError } = await supabase
    .from("sessions")
    .update({ completed: true })
    .eq("id", sessionId);

  if (updateError) {
    throw new Error(`Failed to complete session: ${updateError.message}`);
  }

  revalidatePath("/student");
  revalidatePath("/tutor");
  return { success: true };
}

