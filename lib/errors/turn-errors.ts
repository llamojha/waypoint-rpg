/**
 * Turn error utilities for categorizing and displaying user-friendly error messages.
 */

export type TurnErrorType = "timeout" | "server" | "network" | "validation" | "unknown";

export interface TurnError {
  message: string;
  type: TurnErrorType;
  isRetryable: boolean;
}

const ERROR_MESSAGES: Record<TurnErrorType, string> = {
  timeout: "The request took too long. Please try again.",
  server: "Our servers are having trouble. Please try again in a moment.",
  network: "Unable to connect. Please check your connection and try again.",
  validation: "There was a problem with your action. Please try something else.",
  unknown: "Something went wrong while processing your turn.",
};

/**
 * Categorizes an error and returns a user-friendly message.
 */
export function categorizeTurnError(error: unknown): TurnError {
  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();

  // Timeout errors
  if (
    lowerMessage.includes("timeout") ||
    lowerMessage.includes("timed out") ||
    lowerMessage.includes("aborted")
  ) {
    return { message: ERROR_MESSAGES.timeout, type: "timeout", isRetryable: true };
  }

  // Network errors
  if (
    lowerMessage.includes("network") ||
    lowerMessage.includes("fetch") ||
    lowerMessage.includes("connection") ||
    lowerMessage.includes("failed to fetch")
  ) {
    return { message: ERROR_MESSAGES.network, type: "network", isRetryable: true };
  }

  // Server errors (5xx)
  if (
    lowerMessage.includes("500") ||
    lowerMessage.includes("502") ||
    lowerMessage.includes("503") ||
    lowerMessage.includes("504") ||
    lowerMessage.includes("server error") ||
    lowerMessage.includes("internal error")
  ) {
    return { message: ERROR_MESSAGES.server, type: "server", isRetryable: true };
  }

  // Validation errors (4xx)
  if (
    lowerMessage.includes("400") ||
    lowerMessage.includes("422") ||
    lowerMessage.includes("invalid") ||
    lowerMessage.includes("validation")
  ) {
    return { message: ERROR_MESSAGES.validation, type: "validation", isRetryable: false };
  }

  // Default unknown
  return { message: ERROR_MESSAGES.unknown, type: "unknown", isRetryable: true };
}

/**
 * Gets just the user-friendly message for an error.
 */
export function getTurnErrorMessage(error: unknown): string {
  return categorizeTurnError(error).message;
}
