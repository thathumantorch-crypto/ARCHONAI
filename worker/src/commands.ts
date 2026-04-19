import type { Env } from "./types";
import { analyzeSelfPerformance, identifyImprovements, type ImprovementProposal } from "./self_improve";

const IMPROVEMENT_KEY = "improvement_proposals";

export async function processCommand(
  message: string,
  userId: string,
  env: Env
): Promise<{ isCommand: boolean; response?: string }> {
  const lowerMessage = message.toLowerCase().trim();
  
  if (lowerMessage === "analyze yourself" || lowerMessage === "//analyze") {
    return await handleSelfAnalysis(userId, env);
  }
  
  if (lowerMessage === "propose improvements" || lowerMessage === "//propose") {
    return await handleProposeImprovements(userId, env);
  }
  
  if (lowerMessage.startsWith("//improve ")) {
    return handleCreateProposal(lowerMessage);
  }
  
  if (lowerMessage === "//status") {
    return handleSystemStatus();
  }
  
  if (lowerMessage.startsWith("//help")) {
    return handleHelp();
  }
  
  return { isCommand: false };
}

async function handleSelfAnalysis(userId: string, env: Env): Promise<{ isCommand: boolean; response: string }> {
  const analysis = await analyzeSelfPerformance(`user:${userId}`, env);
  
  const response = `
[SELF ANALYSIS]
━━━━━━━━━━━━━━━━━━━━━━━
Conversations: ${analysis.conversationCount}
Avg Response Length: ${analysis.averageResponseLength} chars
Topics: ${analysis.topicsDiscussed.join(", ")}
Failed Queries: ${analysis.failedQueries.length}
Identified Improvements: ${analysis.improvementsIdentified}
━━━━━━━━━━━━━━━━━━━━━━━

Run "//propose" to see improvement suggestions.
`.trim();
  
  return { isCommand: true, response };
}

async function handleProposeImprovements(userId: string, env: Env): Promise<{ isCommand: boolean; response: string }> {
  const analysis = await analyzeSelfPerformance(`user:${userId}`, env);
  const proposals = identifyImprovements(analysis);
  
  if (proposals.length === 0) {
    return { 
      isCommand: true, 
      response: "No improvements identified. System is performing well!" 
    };
  }
  
  const proposalList = proposals.map((p, i) => 
    `${i + 1}. [${p.category.toUpperCase()}] ${p.title}\n   ${p.description}\n   Risk: ${p.risk} | Human Required: ${p.humanRequired ? "Yes" : "No"}`
  ).join("\n\n");
  
  return { 
    isCommand: true, 
    response: `[IMPROVEMENT PROPOSALS]\n${proposalList}\n\nI cannot approve Level 2+ changes. Human approval required to proceed.` 
  };
}

function handleCreateProposal(message: string): { isCommand: boolean; response: string } {
  const parts = message.replace("//improve ", "").split("|");
  
  if (parts.length < 2) {
    return { 
      isCommand: true, 
      response: "Usage: //improve <title> | <description> | <implementation>" 
    };
  }
  
  const [title, description, implementation] = parts;
  
  const proposal: Partial<ImprovementProposal> = {
    id: `IMP-${Date.now()}`,
    timestamp: new Date().toISOString(),
    title: title.trim(),
    description: description.trim(),
    implementation: implementation?.trim() || "Not specified",
    category: "level2",
    humanRequired: true,
    status: "pending"
  };
  
  return {
    isCommand: true,
    response: `[PROPOSAL CREATED]\n${proposal.title}\n\n${proposal.description}\n\nThis requires human approval before implementation.`
  };
}

function handleSystemStatus(): { isCommand: boolean; response: string } {
  const status = `
[ARCHON STATUS]
━━━━━━━━━━━━━━━━━━━━━━━
Version: Self-Improving v1.0
Mode: Serverless (Cloudflare Workers)
Memory: KV (Cloudflare KV)
Neural Network: Custom LSTM (Render)
Training Data: ${4} documents
━━━━━━━━━━━━━━━━━━━━━━━

Commands:
 //analyze   - Self analysis report
 //propose   - Improvement proposals  
 //improve  - Create proposal (title | desc | impl)
 //status   - This status display
 //help     - Command list
━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
  
  return { isCommand: true, response: status };
}

function handleHelp(): { isCommand: boolean; response: string } {
  const help = `
[ARCHON COMMANDS]
━━━━━━━━━━━━━━━━━━━━━━━
 //analyze   Run self-performance analysis
 //propose   List improvement proposals
 //improve  Create new proposal:
           //improve Title | Desc | How
 //status   Show system status
 //help     Show this help
━━━━━━━━━━━━━━━━━━━━━━━

I continuously analyze myself and identify improvements.
Level 1 changes (minor) I can do automatically.
Level 2+ changes require human approval.
━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
  
  return { isCommand: true, response };
}