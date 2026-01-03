/**
 * Error message sanitization utilities for authentication.
 * Maps internal errors to user-friendly messages and ensures no sensitive data is exposed.
 * Requirements: 7.5
 */

/**
 * Known auth error codes and their user-friendly messages.
 * These map Supabase and OAuth error codes to safe, helpful messages.
 */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  // OAuth errors
  invalid_grant: "This link has expired. Please request a new one.",
  access_denied: "Sign-in was cancelled. Please try again.",
  server_error: "A server error occurred. Please try again later.",
  temporarily_unavailable:
    "Service temporarily unavailable. Please try again later.",
  invalid_request: "Invalid request. Please try again.",
  unauthorized_client: "Authentication failed. Please try again.",
  unsupported_response_type: "Authentication failed. Please try again.",
  invalid_scope: "Authentication failed. Please try again.",

  // Supabase-specific errors
  invalid_credentials: "Invalid email or password. Please try again.",
  email_not_confirmed: "Please verify your email address before signing in.",
  user_not_found: "No account found with this email address.",
  user_already_exists: "An account with this email already exists.",
  signup_disabled: "Sign up is currently disabled. Please try again later.",
  email_provider_disabled: "Email sign-in is currently unavailable.",
  phone_provider_disabled: "Phone sign-in is currently unavailable.",
  otp_expired: "This code has expired. Please request a new one.",
  otp_disabled: "One-time passwords are currently disabled.",
  flow_state_not_found:
    "Session expired. Please start the sign-in process again.",
  flow_state_expired:
    "Session expired. Please start the sign-in process again.",

  // Rate limiting
  over_request_rate_limit:
    "Too many requests. Please wait a moment and try again.",
  over_email_send_rate_limit:
    "Too many emails sent. Please wait before requesting another.",

  // Session errors
  session_not_found: "Your session has expired. Please sign in again.",
  refresh_token_not_found: "Your session has expired. Please sign in again.",
  refresh_token_already_used: "Your session has expired. Please sign in again.",
};

/**
 * Patterns to detect in error messages for additional sanitization.
 * These catch errors that don't have exact code matches.
 */
const ERROR_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /expired|invalid token|token.*invalid/i,
    message: "This link has expired. Please request a new one.",
  },
  {
    pattern: /rate limit|too many|throttl/i,
    message: "Too many attempts. Please wait a moment and try again.",
  },
  {
    pattern: /network|connection|timeout|fetch/i,
    message: "Unable to connect. Please check your connection and try again.",
  },
  {
    pattern: /email.*already|already.*registered/i,
    message: "An account with this email already exists.",
  },
  {
    pattern: /password.*weak|weak.*password/i,
    message: "Please choose a stronger password.",
  },
  {
    pattern: /invalid.*email|email.*invalid/i,
    message: "Please enter a valid email address.",
  },
  {
    pattern: /not.*authorized|unauthorized|forbidden/i,
    message: "You don't have permission to perform this action.",
  },
  {
    pattern: /captcha|verification.*failed/i,
    message: "Verification failed. Please try again.",
  },
];

/**
 * Patterns that indicate sensitive information that should never be exposed.
 * If detected, we return a generic error message.
 */
const SENSITIVE_PATTERNS: RegExp[] = [
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /token/i,
  /credential/i,
  /internal.*error/i,
  /stack.*trace/i,
  /database/i,
  /sql/i,
  /postgres/i,
  /supabase.*url/i,
  /jwt/i,
  /bearer/i,
  /auth.*header/i,
  /user[_-]?id.*[a-f0-9-]{36}/i, // UUID patterns
  /email.*@.*\./i, // Email addresses in error messages
];

/**
 * Default error message when we can't determine a specific user-friendly message.
 */
const DEFAULT_ERROR_MESSAGE = "Authentication failed. Please try again.";

/**
 * Error types for categorizing auth errors.
 */
export type AuthErrorType =
  | "expired"
  | "cancelled"
  | "rate_limit"
  | "network"
  | "validation"
  | "permission"
  | "server"
  | "unknown";

/**
 * Result of sanitizing an error message.
 */
export interface SanitizedError {
  message: string;
  type: AuthErrorType;
  isRetryable: boolean;
}

/**
 * Determines the error type from an error message or code.
 */
function determineErrorType(message: string, code?: string): AuthErrorType {
  const lowerMessage = message.toLowerCase();
  const lowerCode = code?.toLowerCase() || "";

  if (
    lowerMessage.includes("expired") ||
    lowerMessage.includes("invalid token") ||
    lowerCode.includes("expired")
  ) {
    return "expired";
  }

  if (
    lowerMessage.includes("cancelled") ||
    lowerMessage.includes("denied") ||
    lowerCode === "access_denied"
  ) {
    return "cancelled";
  }

  if (
    lowerMessage.includes("rate") ||
    lowerMessage.includes("too many") ||
    lowerCode.includes("rate_limit")
  ) {
    return "rate_limit";
  }

  if (
    lowerMessage.includes("network") ||
    lowerMessage.includes("connection") ||
    lowerMessage.includes("timeout")
  ) {
    return "network";
  }

  if (
    lowerMessage.includes("invalid") ||
    lowerMessage.includes("validation") ||
    lowerCode.includes("invalid")
  ) {
    return "validation";
  }

  if (
    lowerMessage.includes("permission") ||
    lowerMessage.includes("unauthorized") ||
    lowerMessage.includes("forbidden")
  ) {
    return "permission";
  }

  if (
    lowerMessage.includes("server") ||
    lowerCode.includes("server") ||
    lowerCode.includes("internal")
  ) {
    return "server";
  }

  return "unknown";
}

/**
 * Determines if an error is retryable based on its type.
 */
function isErrorRetryable(type: AuthErrorType): boolean {
  switch (type) {
    case "network":
    case "server":
    case "rate_limit":
      return true;
    case "expired":
    case "cancelled":
    case "validation":
    case "permission":
    case "unknown":
      return false;
  }
}

/**
 * Checks if a message contains sensitive information.
 */
function containsSensitiveInfo(message: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Sanitizes an error message to ensure no sensitive data is exposed.
 * Maps internal error codes and messages to user-friendly versions.
 *
 * @param error - The error to sanitize (can be string, Error, or object with message/code)
 * @returns A sanitized error object with user-friendly message
 *
 * Requirements: 7.5 - Handle callback errors gracefully without exposing sensitive information
 */
export function sanitizeAuthError(
  error: string | Error | { message?: string; code?: string } | null | undefined
): SanitizedError {
  // Handle null/undefined
  if (!error) {
    return {
      message: DEFAULT_ERROR_MESSAGE,
      type: "unknown",
      isRetryable: false,
    };
  }

  // Extract message and code from various error formats
  let message: string;
  let code: string | undefined;

  if (typeof error === "string") {
    message = error;
  } else if (error instanceof Error) {
    message = error.message;
    code = (error as { code?: string }).code;
  } else {
    message = error.message || "";
    code = error.code;
  }

  // If message contains sensitive info, return generic message immediately
  if (containsSensitiveInfo(message)) {
    return {
      message: DEFAULT_ERROR_MESSAGE,
      type: "unknown",
      isRetryable: false,
    };
  }

  // Try to match by error code first (most reliable)
  if (code) {
    const lowerCode = code.toLowerCase();
    for (const [errorCode, friendlyMessage] of Object.entries(
      AUTH_ERROR_MESSAGES
    )) {
      if (lowerCode.includes(errorCode.toLowerCase())) {
        const type = determineErrorType(friendlyMessage, code);
        return {
          message: friendlyMessage,
          type,
          isRetryable: isErrorRetryable(type),
        };
      }
    }
  }

  // Try to match by message content
  const lowerMessage = message.toLowerCase();

  // Check known error messages
  for (const [errorCode, friendlyMessage] of Object.entries(
    AUTH_ERROR_MESSAGES
  )) {
    if (lowerMessage.includes(errorCode.toLowerCase().replace(/_/g, " "))) {
      const type = determineErrorType(friendlyMessage, code);
      return {
        message: friendlyMessage,
        type,
        isRetryable: isErrorRetryable(type),
      };
    }
  }

  // Check error patterns
  for (const { pattern, message: friendlyMessage } of ERROR_PATTERNS) {
    if (pattern.test(message)) {
      const type = determineErrorType(friendlyMessage, code);
      return {
        message: friendlyMessage,
        type,
        isRetryable: isErrorRetryable(type),
      };
    }
  }

  // Default fallback
  const type = determineErrorType(message, code);
  return {
    message: DEFAULT_ERROR_MESSAGE,
    type,
    isRetryable: isErrorRetryable(type),
  };
}

/**
 * Convenience function that returns just the sanitized message string.
 * Use this when you only need the message and not the full error info.
 *
 * @param error - The error to sanitize
 * @returns A user-friendly error message string
 */
export function getAuthErrorMessage(
  error: string | Error | { message?: string; code?: string } | null | undefined
): string {
  return sanitizeAuthError(error).message;
}

/**
 * Creates a user-friendly error message for display in the UI.
 * This is the primary function to use when displaying auth errors to users.
 *
 * @param error - The error from Supabase auth operations
 * @returns A safe, user-friendly error message
 */
export function formatAuthError(
  error: string | Error | { message?: string; code?: string } | null | undefined
): string {
  return sanitizeAuthError(error).message;
}
