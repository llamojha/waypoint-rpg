/**
 * Email validation utility for authentication.
 * Validates email format and returns appropriate error messages.
 */

export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

/**
 * Validates an email address format.
 *
 * @param email - The email address to validate
 * @returns ValidationResult with isValid flag and error message if invalid
 */
export function validateEmail(email: string): ValidationResult {
  // Check for empty input
  if (!email || email.trim().length === 0) {
    return {
      isValid: false,
      error: "Please enter an email address",
    };
  }

  const trimmedEmail = email.trim();

  // Basic email format validation
  // Must contain @ symbol with characters before and after
  // Must have a domain with at least one dot
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmedEmail)) {
    return {
      isValid: false,
      error: "Please enter a valid email address",
    };
  }

  // Check for reasonable length
  if (trimmedEmail.length > 254) {
    return {
      isValid: false,
      error: "Email address is too long",
    };
  }

  return {
    isValid: true,
    error: null,
  };
}
