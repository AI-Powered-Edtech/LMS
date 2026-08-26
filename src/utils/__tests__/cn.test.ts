import { describe, expect, it } from "vitest";

import { cn } from "../cn";

describe("cn", () => {
  it("should merge basic class names", () => {
    expect(cn("class1", "class2")).toBe("class1 class2");
  });

  it("should handle conditional class names", () => {
    expect(cn("class1", true && "class2", false && "class3")).toBe(
      "class1 class2",
    );
  });

  it("should handle arrays of class names", () => {
    expect(cn(["class1", "class2"])).toBe("class1 class2");
  });

  it("should merge tailwind utility classes correctly", () => {
    expect(cn("p-2 p-4")).toBe("p-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    expect(cn("bg-red-500 px-2", "bg-blue-500")).toBe("px-2 bg-blue-500");
  });

  it("should handle undefined and null values gracefully", () => {
    expect(cn("class1", undefined, null, "class2")).toBe("class1 class2");
  });
});
