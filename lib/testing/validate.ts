/**
 * Deterministic Trace Validator
 * 
 * Validates trace output against expected behavior using code assertions.
 * No LLM calls - fast and deterministic.
 */

import type { AgentTrace } from "@/types";
import type { TestTurnResult, TraceExpectations, ValidationResult } from "./types";

/**
 * Find a trace by agent name
 */
function findTrace(traces: AgentTrace[], agent: AgentTrace["agent"]): AgentTrace | undefined {
  return traces.find(t => t.agent === agent);
}

/**
 * Find all traces by agent name (some agents have multiple entries)
 */
function findAllTraces(traces: AgentTrace[], agent: AgentTrace["agent"]): AgentTrace[] {
  return traces.filter(t => t.agent === agent);
}

/**
 * Validate trace output against expectations.
 * Returns validation result with list of failures.
 */
export function validateTrace(
  result: TestTurnResult,
  expectations: TraceExpectations
): ValidationResult {
  const failures: string[] = [];
  const { traces, narration } = result;

  // === SENTINEL ===
  if (expectations.sentinel) {
    const sentinel = findTrace(traces, "sentinel");
    if (!sentinel) {
      failures.push("Sentinel trace not found");
    } else if (expectations.sentinel.status && sentinel.status !== expectations.sentinel.status) {
      failures.push(`Sentinel status: expected ${expectations.sentinel.status}, got ${sentinel.status}`);
    }
  }

  // === RUNE MARSHAL ===
  if (expectations.runeMarshal) {
    const runeMarshalTraces = findAllTraces(traces, "rune_marshal");
    const mainTrace = runeMarshalTraces[0];
    
    if (!mainTrace) {
      failures.push("Rune Marshal trace not found");
    } else {
      // Check requires_roll from description
      if (expectations.runeMarshal.requiresRoll !== undefined) {
        const hasRoll = mainTrace.description.includes("check") && mainTrace.description.includes("DC");
        if (expectations.runeMarshal.requiresRoll !== hasRoll) {
          failures.push(`Rune Marshal requiresRoll: expected ${expectations.runeMarshal.requiresRoll}, got ${hasRoll}`);
        }
      }

      // Check skill from description
      if (expectations.runeMarshal?.skill) {
        const expectedSkill = expectations.runeMarshal.skill;
        const hasSkill = mainTrace.description.toLowerCase().includes(expectedSkill.toLowerCase()) ||
          mainTrace.details?.some(d => d.toLowerCase().includes(expectedSkill.toLowerCase()));
        if (!hasSkill) {
          failures.push(`Rune Marshal skill: expected ${expectedSkill}, not found in trace`);
        }
      }

      // Check action type from details or secondary trace
      if (expectations.runeMarshal?.actionType) {
        const expectedActionType = expectations.runeMarshal.actionType;
        const actionTypeTrace = runeMarshalTraces.find(t => t.description.includes("Action type:"));
        const hasActionType = actionTypeTrace?.description.includes(expectedActionType) ||
          mainTrace.details?.some(d => d.toLowerCase().includes(expectedActionType.toLowerCase()));
        if (!hasActionType) {
          failures.push(`Rune Marshal actionType: expected ${expectedActionType}, not found in trace`);
        }
      }
    }
  }

  // === ORCHESTRATOR ===
  if (expectations.orchestrator) {
    const orchestrator = findTrace(traces, "orchestrator");
    if (!orchestrator) {
      failures.push("Orchestrator trace not found");
    } else {
      // Extract proposal count from description (e.g., "Generated 2 proposal(s)")
      const proposalMatch = orchestrator.description.match(/(\d+) proposal/);
      const proposalCount = proposalMatch ? parseInt(proposalMatch[1], 10) : 0;

      if (expectations.orchestrator.maxProposals !== undefined && proposalCount > expectations.orchestrator.maxProposals) {
        failures.push(`Orchestrator proposals: expected max ${expectations.orchestrator.maxProposals}, got ${proposalCount}`);
      }

      if (expectations.orchestrator.minProposals !== undefined && proposalCount < expectations.orchestrator.minProposals) {
        failures.push(`Orchestrator proposals: expected min ${expectations.orchestrator.minProposals}, got ${proposalCount}`);
      }

      // Check allowed proposal types
      if (expectations.orchestrator.allowedProposalTypes && orchestrator.details) {
        const proposalDetails = orchestrator.details.filter(d => d.startsWith("→"));
        for (const detail of proposalDetails) {
          const isAllowed = expectations.orchestrator.allowedProposalTypes.some(type => 
            detail.toLowerCase().includes(type.toLowerCase())
          );
          if (!isAllowed && !detail.includes("No state changes")) {
            failures.push(`Orchestrator proposal type not allowed: ${detail}`);
          }
        }
      }
    }
  }

  // === ARBITER ===
  if (expectations.arbiter) {
    const arbiter = findTrace(traces, "arbiter");
    if (!arbiter) {
      failures.push("Arbiter trace not found");
    } else {
      // Extract rejection count from description
      const rejectedMatch = arbiter.description.match(/Rejected (\d+)/);
      const rejectionCount = rejectedMatch ? parseInt(rejectedMatch[1], 10) : 0;

      if (expectations.arbiter.maxRejections !== undefined && rejectionCount > expectations.arbiter.maxRejections) {
        failures.push(`Arbiter rejections: expected max ${expectations.arbiter.maxRejections}, got ${rejectionCount}`);
      }
    }
  }

  // === CHRONICLER (narration) ===
  if (expectations.chronicler) {
    const chronicler = findTrace(traces, "chronicler");
    if (!chronicler) {
      failures.push("Chronicler trace not found");
    }

    if (expectations.chronicler.narrationMinLength !== undefined) {
      if (narration.length < expectations.chronicler.narrationMinLength) {
        failures.push(`Narration too short: expected min ${expectations.chronicler.narrationMinLength} chars, got ${narration.length}`);
      }
    }
  }

  // === BASIC SANITY CHECKS ===
  // Always check that narration exists (unless explicitly testing denial)
  if (!narration || narration.length === 0) {
    failures.push("Narration is empty");
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

/**
 * Pre-defined expectations for common scenarios
 */
export const SCENARIO_EXPECTATIONS = {
  /** "I look around" - passive observation, no roll, no proposals */
  lookAround: {
    sentinel: { status: "success" as const },
    runeMarshal: { requiresRoll: false, actionType: "passive" },
    orchestrator: { maxProposals: 0 },
    arbiter: { maxRejections: 0 },
    chronicler: { narrationMinLength: 50 },
  },

  /** Conversation with NPC - no roll, may have relationship proposal */
  conversation: {
    sentinel: { status: "success" as const },
    runeMarshal: { requiresRoll: false, actionType: "conversation" },
    arbiter: { maxRejections: 0 },
    chronicler: { narrationMinLength: 50 },
  },

  /** Travel to location - no roll, location change proposal */
  travel: {
    sentinel: { status: "success" as const },
    runeMarshal: { requiresRoll: false, actionType: "travel" },
    orchestrator: { allowedProposalTypes: ["location", "Travel to"] },
    arbiter: { maxRejections: 0 },
    chronicler: { narrationMinLength: 50 },
  },
} satisfies Record<string, TraceExpectations>;
