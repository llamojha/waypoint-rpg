/**
 * Integration Test Types
 * 
 * Types for the automated testing framework.
 */

import type { AgentTrace, TurnDiff, Turn, Character, WorldContext } from "@/types";

/** Result of executing a turn in test mode */
export interface TestTurnResult {
  turnId: string;
  narration: string;
  diffs: TurnDiff[];
  suggestedActions: string[];
  mechanics?: Turn["mechanics"];
  traces: AgentTrace[];
  character: Character;
  world: WorldContext;
}

/** Expectations for trace validation */
export interface TraceExpectations {
  sentinel?: {
    status: "success" | "error";
  };
  runeMarshal?: {
    requiresRoll?: boolean;
    skill?: string;
    actionType?: string;
  };
  orchestrator?: {
    maxProposals?: number;
    minProposals?: number;
    allowedProposalTypes?: string[];
  };
  arbiter?: {
    maxRejections?: number;
  };
  chronicler?: {
    narrationMinLength?: number;
  };
}

/** Result of trace validation */
export interface ValidationResult {
  passed: boolean;
  failures: string[];
}

/** Gemini QA validation result */
export interface GeminiQAResult {
  passed: boolean;
  reasoning: string;
  confidence: number;
}

/** Test scenario definition */
export interface TestScenario {
  name: string;
  description: string;
  action: string;
  expectations: TraceExpectations;
  /** Optional: expected content in narration (for Gemini QA) */
  expectedNarrationHints?: string[];
}
