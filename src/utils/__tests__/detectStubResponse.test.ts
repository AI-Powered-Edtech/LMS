import { beforeEach,describe, expect, it, vi } from "vitest";

import { useToast } from "@/hooks/useToast";

import { detectStubResponse } from "../detectStubResponse";

// Mock the useToast hook
vi.mock("@/hooks/useToast", () => ({
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
    (useToast.getState as any).mockReturnValue({ addToast: addToastMock });
  });

  it("returns false for null payload", () => {
    expect(detectStubResponse(null, "Test Feature")).toBe(false);
    expect(addToastMock).not.toHaveBeenCalled();
  });

  it("returns false for non-object payload", () => {
    expect(detectStubResponse("string", "Test Feature")).toBe(false);
    expect(detectStubResponse(123, "Test Feature")).toBe(false);
    expect(addToastMock).not.toHaveBeenCalled();
  });

  it("returns false for object without stub property", () => {
    expect(detectStubResponse({ data: "real data" }, "Test Feature")).toBe(
      false,
    );
    expect(addToastMock).not.toHaveBeenCalled();
  });

  it("returns false for object with stub: false", () => {
    expect(detectStubResponse({ stub: false }, "Test Feature")).toBe(false);
    expect(addToastMock).not.toHaveBeenCalled();
  });

  it("returns true and shows toast for object with stub: true", () => {
    expect(detectStubResponse({ stub: true }, "Test Feature")).toBe(true);
    expect(addToastMock).toHaveBeenCalledWith({
      type: "info",
      message: "Test Feature sedang dikembangkan",
      description:
        "Backend masih mengembalikan data placeholder. Fitur penuh akan tersedia di fase berikutnya.",
    });
  });
});
