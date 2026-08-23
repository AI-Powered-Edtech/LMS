import { renderHook } from "@testing-library/react";
import { describe, expect, it, afterEach } from "vitest";
import { usePageTitle } from "../usePageTitle";

describe("usePageTitle", () => {
  const originalTitle = document.title;

  afterEach(() => {
    document.title = originalTitle;
  });

  it("should set default title when empty string provided", () => {
    renderHook(() => usePageTitle(""));
    expect(document.title).toBe("EduSync LMS");
  });

  it("should append suffix when appendSuffix is true (default)", () => {
    renderHook(() => usePageTitle("Dashboard"));
    expect(document.title).toBe("Dashboard | EduSync LMS");
  });

  it("should not append suffix when appendSuffix is false", () => {
    renderHook(() => usePageTitle("Dashboard", false));
    expect(document.title).toBe("Dashboard");
  });

  it("should update title when props change", () => {
    const { rerender } = renderHook(
      ({ title, appendSuffix }) => usePageTitle(title, appendSuffix),
      { initialProps: { title: "Page 1", appendSuffix: true } },
    );
    expect(document.title).toBe("Page 1 | EduSync LMS");

    rerender({ title: "Page 2", appendSuffix: false });
    expect(document.title).toBe("Page 2");
  });
});
