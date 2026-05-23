/**
 * EmptyState — unit tests
 *
 * Tests the EmptyState component (T-09):
 * - data-slot attributes on root and key children
 * - title and description text rendered
 * - action ReactNode rendered when provided, omitted when absent
 * - className merging
 * - No next/link import (action is ReactNode)
 *
 * Uses direct function invocation pattern — same as badge.test.ts.
 */

import { describe, expect, it } from "vitest";
import { EmptyState } from "../empty-state";

// Minimal stub for LucideIcon (it's just a function component accepting size/className)
function MockIcon(_props: { className?: string; "aria-hidden"?: string }) {
  return null;
}

function render(props: Partial<Parameters<typeof EmptyState>[0]> = {}) {
  return EmptyState({
    icon: MockIcon as Parameters<typeof EmptyState>[0]["icon"],
    title: "No items",
    description: "Get started by creating one.",
    ...props,
  }) as {
    props: {
      "data-slot": string;
      className: string;
      children: unknown[];
    };
  };
}

describe("EmptyState — root element", () => {
  it("has data-slot=empty-state", () => {
    const result = render();
    expect(result.props["data-slot"]).toBe("empty-state");
  });

  it("includes flex and items-center base classes", () => {
    const result = render();
    expect(result.props.className).toContain("flex");
    expect(result.props.className).toContain("items-center");
    expect(result.props.className).toContain("justify-center");
  });

  it("merges custom className", () => {
    const result = render({ className: "mt-12" });
    expect(result.props.className).toContain("mt-12");
  });
});

describe("EmptyState — icon", () => {
  it("renders icon wrapper with data-slot=empty-state-icon", () => {
    const result = render();
    const iconWrapper = result.props.children[0] as {
      props: { "data-slot": string };
    };
    expect(iconWrapper.props["data-slot"]).toBe("empty-state-icon");
  });

  it("icon wrapper has bg-muted class", () => {
    const result = render();
    const iconWrapper = result.props.children[0] as {
      props: { className: string };
    };
    expect(iconWrapper.props.className).toContain("bg-muted");
  });
});

describe("EmptyState — title and description", () => {
  it("renders title text", () => {
    const result = render({ title: "Empty workspace" });
    const textContainer = result.props.children[1] as {
      props: { children: unknown[] };
    };
    const titleEl = textContainer.props.children[0] as {
      props: { children: string; "data-slot": string };
    };
    expect(titleEl.props.children).toBe("Empty workspace");
    expect(titleEl.props["data-slot"]).toBe("empty-state-title");
  });

  it("renders description text", () => {
    const result = render({ description: "Create your first resource." });
    const textContainer = result.props.children[1] as {
      props: { children: unknown[] };
    };
    const descEl = textContainer.props.children[1] as {
      props: { children: string; "data-slot": string };
    };
    expect(descEl.props.children).toBe("Create your first resource.");
    expect(descEl.props["data-slot"]).toBe("empty-state-description");
  });
});

describe("EmptyState — action", () => {
  it("renders action wrapper when action is provided", () => {
    const result = render({ action: "ActionNode" });
    const actionWrapper = result.props.children[2] as {
      props: { "data-slot": string; children: string };
    };
    expect(actionWrapper).toBeTruthy();
    expect(actionWrapper.props["data-slot"]).toBe("empty-state-action");
    expect(actionWrapper.props.children).toBe("ActionNode");
  });

  it("does not render action wrapper when action is omitted", () => {
    const result = render();
    // Third child should be falsy
    expect(result.props.children[2]).toBeFalsy();
  });
});
