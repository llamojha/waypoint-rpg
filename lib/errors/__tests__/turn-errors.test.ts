import { describe, it, expect } from "vitest";
import { categorizeTurnError, getTurnErrorMessage } from "../turn-errors";

describe("categorizeTurnError", () => {
  describe("timeout errors", () => {
    it.each(["timeout", "timed out", "aborted"])("detects '%s'", (keyword) => {
      const result = categorizeTurnError(new Error(`Request ${keyword}`));
      expect(result.type).toBe("timeout");
      expect(result.isRetryable).toBe(true);
    });
  });

  describe("network errors", () => {
    it.each(["network", "fetch", "connection", "failed to fetch"])("detects '%s'", (keyword) => {
      const result = categorizeTurnError(new Error(`${keyword} error`));
      expect(result.type).toBe("network");
      expect(result.isRetryable).toBe(true);
    });
  });

  describe("server errors", () => {
    it.each(["500", "502", "503", "504", "server error", "internal error"])("detects '%s'", (keyword) => {
      const result = categorizeTurnError(new Error(`HTTP ${keyword}`));
      expect(result.type).toBe("server");
      expect(result.isRetryable).toBe(true);
    });
  });

  describe("validation errors", () => {
    it.each(["400", "422", "invalid", "validation"])("detects '%s'", (keyword) => {
      const result = categorizeTurnError(new Error(`${keyword} input`));
      expect(result.type).toBe("validation");
      expect(result.isRetryable).toBe(false);
    });
  });

  describe("unknown errors", () => {
    it("returns unknown for unrecognized errors", () => {
      const result = categorizeTurnError(new Error("Something weird happened"));
      expect(result.type).toBe("unknown");
      expect(result.isRetryable).toBe(true);
    });

    it("handles plain strings", () => {
      const result = categorizeTurnError("plain string error");
      expect(result.type).toBe("unknown");
    });

    it("handles null/undefined", () => {
      const result = categorizeTurnError(null);
      expect(result.type).toBe("unknown");
    });
  });
});

describe("getTurnErrorMessage", () => {
  it("returns user-friendly message", () => {
    const message = getTurnErrorMessage(new Error("timeout"));
    expect(message).toBe("The request took too long. Please try again.");
  });
});
