import { requireRole } from "@/lib/auth";
import { getMyKnowledgeGraph } from "@/app/actions/knowledge-graph";
import { LearningPathClient } from "./learning-path-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learning Path · Mentrixa",
  description: "Your personalised skill map and adaptive learning progress.",
};

export default async function LearningPathPage() {
  await requireRole(["student", "admin"]);
  const { nodes, tree, recommendations } = await getMyKnowledgeGraph();

  return (
    <LearningPathClient
      nodes={nodes}
      tree={tree}
      recommendations={recommendations}
    />
  );
}
