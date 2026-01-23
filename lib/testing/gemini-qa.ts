/**
 * Gemini QA Validator
 * 
 * Uses Gemini to evaluate test results for quality and correctness.
 * Only runs when --gemini-qa flag is passed.
 */

import { GoogleGenAI } from "@google/genai";
import type { TestTurnResult, TestScenario, GeminiQAResult } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

/**
 * Build the QA prompt for Gemini
 */
function buildQAPrompt(result: TestTurnResult, scenario: TestScenario): string {
  const tracesSummary = result.traces.map(t => 
    `- ${t.agent}: ${t.status} - ${t.description}`
  ).join("\n");

  return `You are a QA validator for a text-based RPG game. Evaluate if the following turn result is appropriate for the given scenario.

## Scenario
Name: ${scenario.name}
Description: ${scenario.description}
Player Action: "${scenario.action}"

## Expected Behavior
${scenario.expectedNarrationHints?.map(h => `- ${h}`).join("\n") || "No specific hints provided"}

## Actual Result

### Narration
${result.narration}

### Agent Traces
${tracesSummary}

### State Changes (Diffs)
${result.diffs.length > 0 ? result.diffs.map(d => `- ${d.type}: ${d.text}`).join("\n") : "No state changes"}

## Evaluation Criteria
1. Does the narration make sense for the player action?
2. Is the narration appropriate in tone (PG-13 fantasy)?
3. Does the narration describe the scene/action adequately?
4. Are the state changes (if any) reasonable for this action?
5. Did the agent pipeline behave correctly?

## Response Format
Respond with a JSON object:
{
  "passed": true/false,
  "reasoning": "Brief explanation of your evaluation",
  "confidence": 0.0-1.0
}`;
}

/**
 * Validate a test result using Gemini as a QA judge.
 * Returns structured judgment with reasoning.
 */
export async function validateWithGemini(
  result: TestTurnResult,
  scenario: TestScenario
): Promise<GeminiQAResult> {
  const prompt = buildQAPrompt(result, scenario);

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        temperature: 0.1, // Low temp for consistent evaluation
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "";
    const parsed = JSON.parse(text);

    return {
      passed: Boolean(parsed.passed),
      reasoning: String(parsed.reasoning || "No reasoning provided"),
      confidence: Number(parsed.confidence) || 0.5,
    };
  } catch (error) {
    console.error("Gemini QA validation error:", error);
    return {
      passed: false,
      reasoning: `Gemini QA failed: ${error instanceof Error ? error.message : String(error)}`,
      confidence: 0,
    };
  }
}
