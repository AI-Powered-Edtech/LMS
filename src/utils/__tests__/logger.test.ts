import { afterEach,beforeEach, describe, expect, it, vi } from "vitest";

import { logger } from "@/utils/logger";

describe("logger utility", () => {
  let consoleSpy: {
    debug: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    consoleSpy = {
      debug: vi.spyOn(console, "debug").mockImplementation(() => {}),
      info: vi.spyOn(console, "info").mockImplementation(() => {}),
      warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.debug.mockRestore();
    consoleSpy.info.mockRestore();
    consoleSpy.warn.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe("log levels", () => {
    describe("debug level", () => {
      it("logs debug messages in development", () => {
        logger.debug("Debug message");

        expect(consoleSpy.debug).toHaveBeenCalled();
      });

      it("includes timestamp in debug output", () => {
        logger.debug("Debug message");

        const call = consoleSpy.debug.mock.calls[0][0];
        expect(call).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      });

      it("includes level in debug output", () => {
        logger.debug("Debug message");

        const call = consoleSpy.debug.mock.calls[0][0];
        expect(call).toContain("[DEBUG]");
      });

      it("includes message in debug output", () => {
        logger.debug("Test debug message");

        const call = consoleSpy.debug.mock.calls[0][0];
        expect(call).toContain("Test debug message");
      });

      it("handles additional arguments", () => {
        logger.debug("Debug with data", { key: "value" }, 123);

        const call = consoleSpy.debug.mock.calls[0][0];
        expect(call).toContain("Data:");
      });
    });

    describe("info level", () => {
      it("logs info messages in development", () => {
        logger.info("Info message");

        expect(consoleSpy.info).toHaveBeenCalled();
      });

      it("includes timestamp in info output", () => {
        logger.info("Info message");

        const call = consoleSpy.info.mock.calls[0][0];
        expect(call).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      });

      it("includes level in info output", () => {
        logger.info("Info message");

        const call = consoleSpy.info.mock.calls[0][0];
        expect(call).toContain("[INFO]");
      });

      it("includes message in info output", () => {
        logger.info("Test info message");

        const call = consoleSpy.info.mock.calls[0][0];
        expect(call).toContain("Test info message");
      });
    });

    describe("warn level", () => {
      it("logs warn messages", () => {
        logger.warn("Warning message");

        expect(consoleSpy.warn).toHaveBeenCalled();
      });

      it("includes timestamp in warn output", () => {
        logger.warn("Warning message");

        const call = consoleSpy.warn.mock.calls[0][0];
        expect(call).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      });

      it("includes level in warn output", () => {
        logger.warn("Warning message");

        const call = consoleSpy.warn.mock.calls[0][0];
        expect(call).toContain("[WARN]");
      });

      it("includes message in warn output", () => {
        logger.warn("Test warning message");

        const call = consoleSpy.warn.mock.calls[0][0];
        expect(call).toContain("Test warning message");
      });

      it("handles additional arguments", () => {
        logger.warn("Warning with data", { key: "value" });

        const call = consoleSpy.warn.mock.calls[0][0];
        expect(call).toContain("Data:");
      });
    });

    describe("error level", () => {
      it("logs error messages", () => {
        logger.error("Error message");

        expect(consoleSpy.error).toHaveBeenCalled();
      });

      it("includes timestamp in error output", () => {
        logger.error("Error message");

        const call = consoleSpy.error.mock.calls[0][0];
        expect(call).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      });

      it("includes level in error output", () => {
        logger.error("Error message");

        const call = consoleSpy.error.mock.calls[0][0];
        expect(call).toContain("[ERROR]");
      });

      it("includes message in error output", () => {
        logger.error("Test error message");

        const call = consoleSpy.error.mock.calls[0][0];
        expect(call).toContain("Test error message");
      });
    });
  });

  describe("error formatting", () => {
    it("formats Error objects correctly", () => {
      const error = new Error("Test error message");
      logger.error(error);

      expect(consoleSpy.error).toHaveBeenCalled();
      const call = consoleSpy.error.mock.calls[0][0];
      expect(call).toContain("Test error message");
    });

    it("includes error stack when available", () => {
      const error = new Error("Test error with stack");
      logger.error(error);

      const calls = consoleSpy.error.mock.calls;
      const hasStack = calls.some((call) =>
        call.some(
          (c) =>
            typeof c === "string" &&
            c.includes("at ") &&
            c.includes("Test error with stack"),
        ),
      );
      expect(hasStack).toBe(true);
    });

    it("handles string error messages", () => {
      logger.error("String error message");

      const call = consoleSpy.error.mock.calls[0][0];
      expect(call).toContain("String error message");
    });

    it("handles unknown error types", () => {
      logger.error(null as never);
      logger.error(undefined as never);
      logger.error(123 as never);

      expect(consoleSpy.error).toHaveBeenCalledTimes(3);
    });

    it("handles Error in args array", () => {
      const error = new Error("Error in args");
      logger.error("Main message", error);

      const calls = consoleSpy.error.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const args = calls[0];
      expect(
        args.some(
          (arg) => typeof arg === "string" && arg.includes("Error in args"),
        ),
      ).toBe(true);
    });

    it("formats multiple additional arguments", () => {
      logger.error("Error with args", { data: "value" }, ["array"], 123);

      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it("extracts message from Error instances correctly", () => {
      const error = new Error("Extracted message");
      logger.error(error);

      const call = consoleSpy.error.mock.calls[0][0];
      expect(call).toContain("Extracted message");
    });
  });

  describe("message formatting", () => {
    it("formats timestamp correctly", () => {
      logger.info("Test");
      const call = consoleSpy.info.mock.calls[0][0];
      const timestamp = call.match(/\[(.*?)\]/)?.[1];
      expect(timestamp).toBeDefined();
      expect(new Date(timestamp!).toString()).not.toBe("Invalid Date");
    });

    it("formats multiple arguments as JSON", () => {
      const obj = { nested: { value: "deep" } };
      logger.info("Message", obj);

      const call = consoleSpy.info.mock.calls[0][0];
      expect(call).toContain("Data:");
      expect(call).toContain("nested");
      expect(call).toContain("value");
    });

    it("shows empty Data section when no args provided", () => {
      logger.info("Simple message");

      const call = consoleSpy.info.mock.calls[0][0];
      expect(call).not.toContain("Data:");
    });

    it("passes additional args to console", () => {
      const error = new Error("Error");
      logger.error(error, { extra: "data" });

      expect(consoleSpy.error).toHaveBeenCalled();
      const callArgs = consoleSpy.error.mock.calls[0];
      expect(callArgs.length).toBeGreaterThan(2);
    });
  });
});
