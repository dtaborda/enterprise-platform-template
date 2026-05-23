/**
 * PageHeader — unit tests
 *
 * Tests the PageHeader component (T-07):
 * - title prop renders in h1 with correct slot
 * - subtitle renders when provided, hidden when omitted
 * - action renders when provided, hidden when omitted
 * - className is merged correctly
 *
 * Uses direct function invocation to inspect returned React element —
 * same pattern as badge.test.ts and button.test.ts.
 */

import { describe, expect, it } from "vitest";
import { PageHeader } from "../page-header";

describe("PageHeader — title", () => {
  it("renders with data-slot=page-header on root", () => {
    const result = PageHeader({ title: "My Page" }) as {
      props: { "data-slot": string };
    };
    expect(result.props["data-slot"]).toBe("page-header");
  });

  it("passes title text to the title child", () => {
    const result = PageHeader({ title: "Workspace Settings" }) as {
      props: { children: unknown[] };
    };
    // First child is the text+subtitle container
    const textContainer = result.props.children[0] as {
      props: { children: unknown[] };
    };
    const h1 = textContainer.props.children[0] as {
      props: { children: string };
    };
    expect(h1.props.children).toBe("Workspace Settings");
  });

  it("h1 has data-slot=page-header-title", () => {
    const result = PageHeader({ title: "Title" }) as {
      props: { children: unknown[] };
    };
    const textContainer = result.props.children[0] as {
      props: { children: unknown[] };
    };
    const h1 = textContainer.props.children[0] as {
      props: { "data-slot": string };
    };
    expect(h1.props["data-slot"]).toBe("page-header-title");
  });
});

describe("PageHeader — subtitle", () => {
  it("renders subtitle when provided", () => {
    const result = PageHeader({ title: "Page", subtitle: "A description" }) as {
      props: { children: unknown[] };
    };
    const textContainer = result.props.children[0] as {
      props: { children: unknown[] };
    };
    const subtitle = textContainer.props.children[1] as {
      props: { children: string; "data-slot": string };
    };
    expect(subtitle).toBeTruthy();
    expect(subtitle.props.children).toBe("A description");
    expect(subtitle.props["data-slot"]).toBe("page-header-subtitle");
  });

  it("does not render subtitle when omitted", () => {
    const result = PageHeader({ title: "Page" }) as {
      props: { children: unknown[] };
    };
    const textContainer = result.props.children[0] as {
      props: { children: unknown[] };
    };
    // subtitle slot is the second child — should be falsy
    expect(textContainer.props.children[1]).toBeFalsy();
  });
});

describe("PageHeader — action", () => {
  it("renders action node when provided", () => {
    const result = PageHeader({ title: "Page", action: "ActionNode" }) as {
      props: { children: unknown[] };
    };
    const actionWrapper = result.props.children[1] as {
      props: { children: string; "data-slot": string };
    };
    expect(actionWrapper).toBeTruthy();
    expect(actionWrapper.props["data-slot"]).toBe("page-header-action");
    expect(actionWrapper.props.children).toBe("ActionNode");
  });

  it("does not render action wrapper when action is omitted", () => {
    const result = PageHeader({ title: "Page" }) as {
      props: { children: unknown[] };
    };
    // Second child (action wrapper) should be falsy
    expect(result.props.children[1]).toBeFalsy();
  });
});

describe("PageHeader — className", () => {
  it("includes base layout classes", () => {
    const result = PageHeader({ title: "Page" }) as {
      props: { className: string };
    };
    expect(result.props.className).toContain("flex");
    expect(result.props.className).toContain("items-start");
    expect(result.props.className).toContain("justify-between");
  });

  it("merges custom className", () => {
    const result = PageHeader({ title: "Page", className: "mb-8" }) as {
      props: { className: string };
    };
    expect(result.props.className).toContain("mb-8");
  });
});
