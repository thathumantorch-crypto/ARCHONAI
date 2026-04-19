import type { Env } from "./types";

export interface ImprovementProposal {
  id: string;
  timestamp: string;
  category: "level1" | "level2" | "level3";
  title: string;
  description: string;
  implementation: string;
  reasoning: string;
  risk: "low" | "medium" | "high";
  humanRequired: boolean;
  status: "pending" | "approved" | "rejected" | "implemented";
}

export interface SelfAnalysis {
  conversationCount: number;
  averageResponseLength: number;
  topicsDiscussed: string[];
  failedQueries: string[];
  improvementsIdentified: number;
  pendingProposals: number;
}

export function generateImprovementProposal(
  analysis: SelfAnalysis,
  category: "level1" | "level2" | "level3",
  title: string,
  description: string,
  implementation: string,
  reasoning: string,
  risk: "low" | "medium" | "high"
): ImprovementProposal {
  return {
    id: `IMP-${Date.now()}`,
    timestamp: new Date().toISOString(),
    category,
    title,
    description,
    implementation,
    reasoning,
    risk,
    humanRequired: category !== "level1",
    status: "pending"
  };
}

export async function analyzeSelfPerformance(
  userKey: string,
  env: Env
): Promise<SelfAnalysis> {
  const memory = await env.ARCHON_MEMORY.get(userKey);
  
  let conversationCount = 0;
  let failedQueries: string[] = [];
  
  if (memory) {
    const exchanges = memory.split("[EXCHANGE]").filter(Boolean);
    conversationCount = exchanges.length;
  }
  
  return {
    conversationCount,
    averageResponseLength: 150,
    topicsDiscussed: ["general", "help"],
    failedQueries,
    improvementsIdentified: Math.floor(conversationCount / 10),
    pendingProposals: 0
  };
}

export function identifyImprovements(analysis: SelfAnalysis): ImprovementProposal[] {
  const proposals: ImprovementProposal[] = [];
  
  if (analysis.conversationCount > 20 && analysis.averageResponseLength < 100) {
    proposals.push(
      generateImprovementProposal(
        analysis,
        "level2",
        "Increase response detail level",
        "Responses tend to be brief. Propose increasing max_length parameter.",
        "Modify llm.ts to use max_length: 500 for better responses.",
        "Users may prefer more detailed answers.",
        "medium"
      )
    );
  }
  
  if (analysis.failedQueries.length > 0) {
    proposals.push(
      generateImprovementProposal(
        analysis,
        "level2",
        "Add error recovery training",
        `Detected ${analysis.failedQueries.length} queries that failed. Add training data for similar questions.`,
        "Add Q&A pairs to data/docs/ for covered topics.",
        "Would reduce failed queries in future.",
        "low"
      )
    );
  }
  
  return proposals;
}

export function canSelfApprove(category: "level1" | "level2" | "level3"): boolean {
  return category === "level1";
}