import { beforeEach, describe, expect, it, vi } from "vitest";

import { useToast } from "../../hooks/useToast";
import { detectStubResponse } from "../detectStubResponse";

describe("detectStubResponse", () => {
  let addToastSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    const state = useToast.getState();
    addToastSpy = vi.spyOn(state, "addToast").mockImplementation(() => {});
  });

  it("should return false for null payload", () => {
    expect(detectStubResponse(null, "Test Feature")).toBe(false);
    expect(addToastSpy).not.toHaveBeenCalled();
  });

  it("should return false for non-object payload", () => {
    expect(detectStubResponse("string payload", "Test Feature")).toBe(false);
    expect(addToastSpy).not.toHaveBeenCalled();
  });

  it("should return false if stub is false", () => {
    expect(detectStubResponse({ stub: false }, "Test Feature")).toBe(false);
    expect(addToastSpy).not.toHaveBeenCalled();
  });

  it("should return false if stub is missing", () => {
    expect(detectStubResponse({ data: "some data" }, "Test Feature")).toBe(
      false,
    );
    expect(addToastSpy).not.toHaveBeenCalled();
  });

  it("should return true and call addToast if stub is true", () => {
    expect(detectStubResponse({ stub: true }, "Test Feature")).toBe(true);
    expect(addToastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "info",
        message: "Test Feature sedang dikembangkan",
        description:
          "Backend masih mengembalikan data placeholder. Fitur penuh akan tersedia di fase berikutnya.",
      }),
    );
  });
});
