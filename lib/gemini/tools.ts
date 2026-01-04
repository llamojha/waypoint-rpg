import { Type, Schema } from "@google/genai";
import type { FunctionDeclaration } from "@google/genai";

// Re-export for convenience
export { Type };
export type { FunctionDeclaration, Schema };

/**
 * Helper to create a FunctionDeclaration with proper typing
 */
export function createTool(
  name: string,
  description: string,
  parameters: Schema
): FunctionDeclaration {
  return { name, description, parameters };
}
