import { afterEach,beforeEach, describe, expect, it, vi } from "vitest";

import { useToast } from "@/hooks/useToast";

import { detectStubResponse } from "../detectStubResponse";

describe("detectStubResponse", () => {
  beforeEach(() => {
    vi.spyOn(useToast, "getState").mockReturnValue({
      addToast: vi.fn(),
      toasts: [],
      removeToast: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return false if payload is not an object", () => {
    expect(detectStubResponse("string", "Feature")).toBe(false);
    expect(detectStubResponse(123, "Feature")).toBe(false);
    expect(detectStubResponse(null, "Feature")).toBe(false);
    expect(detectStubResponse(undefined, "Feature")).toBe(false);
    expect(useToast.getState().addToast).not.toHaveBeenCalled();
  });

  it("should return false if payload does not have stub: true", () => {
    expect(detectStubResponse({}, "Feature")).toBe(false);
    expect(detectStubResponse({ stub: false }, "Feature")).toBe(false);
    expect(detectStubResponse({ data: "real data" }, "Feature")).toBe(false);
    expect(useToast.getState().addToast).not.toHaveBeenCalled();
  });

  it("should return true and call addToast if payload has stub: true", () => {
    expect(detectStubResponse({ stub: true }, "Fitur Laporan")).toBe(true);
    expect(useToast.getState().addToast).toHaveBeenCalledWith({
      type: "info",
      message: "Fitur Laporan sedang dikembangkan",
      description:
        "Backend masih mengembalikan data placeholder. Fitur penuh akan tersedia di fase berikutnya.",
    });
  });
});
