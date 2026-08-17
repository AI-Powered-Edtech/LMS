import { beforeEach,describe, expect, it, vi } from "vitest";

import { useToast } from "../../hooks/useToast";
import { detectStubResponse } from "../detectStubResponse";

// Mock useToast hook
vi.mock("../../hooks/useToast", () => ({
  useToast: {
    getState: vi.fn(() => ({
      addToast: vi.fn(),
    })),
  },
}));

describe("detectStubResponse", () => {
  let addToastMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    addToastMock = vi.fn();
    (useToast.getState as any).mockReturnValue({
      addToast: addToastMock,
    });
  });

  it("should return false for null payload", () => {
    expect(detectStubResponse(null, "Test Feature")).toBe(false);
    expect(addToastMock).not.toHaveBeenCalled();
  });

  it("should return false for non-object payload", () => {
    expect(detectStubResponse("string payload", "Test Feature")).toBe(false);
    expect(addToastMock).not.toHaveBeenCalled();
  });

  it("should return false if stub is false", () => {
    expect(detectStubResponse({ stub: false }, "Test Feature")).toBe(false);
    expect(addToastMock).not.toHaveBeenCalled();
  });

  it("should return false if stub is missing", () => {
    expect(detectStubResponse({ data: "some data" }, "Test Feature")).toBe(
      false,
    );
    expect(addToastMock).not.toHaveBeenCalled();
  });

  it("should return true and call addToast if stub is true", () => {
    expect(detectStubResponse({ stub: true }, "Test Feature")).toBe(true);
    expect(addToastMock).toHaveBeenCalledWith({
      type: "info",
      message: "Test Feature sedang dikembangkan",
      description:
        "Backend masih mengembalikan data placeholder. Fitur penuh akan tersedia di fase berikutnya.",
    });
  });
});
