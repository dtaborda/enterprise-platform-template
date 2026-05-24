/**
 * ErrorState — unit tests
 *
 * Tests the ErrorState component (T-11):
 * - default title and message when props omitted
 * - custom title and message when provided
 * - onReset button rendered when provided, omitted when absent
 * - className merging
 * - data-slot attributes on key elements
 *
 * Uses direct function invocation pattern — same as badge.test.ts.
 */

import { describe, expect, it, vi } from "vitest";
import { ErrorState } from "../error-state";

function render(props: Parameters<typeof ErrorState>[0] = {}) {
  return ErrorState(props) as {
    props: {
      "data-slot": string;
      className: string;
      children: unknown[];
    };
  };
}

describe("ErrorState — root element", () => {
  it("has data-slot=error-state", () => {
    const result = render();
    expect(result.props["data-slot"]).toBe("error-state");
  });

  it("includes flex layout classes", () => {
    const result = render();
    expect(result.props.className).toContain("flex");
    expect(result.props.className).toContain("items-center");
    expect(result.props.className).toContain("justify-center");
  });

  it("merges custom className", () => {
    const result = render({ className: "border border-destructive/20" });
    expect(result.props.className).toContain("border-destructive/20");
  });
});

describe("ErrorState — icon", () => {
  it("has data-slot=error-state-icon on icon wrapper", () => {
    const result = render();
    const iconWrapper = result.props.children[0] as {
      props: { "data-slot": string };
    };
    expect(iconWrapper.props["data-slot"]).toBe("error-state-icon");
  });

  it("icon wrapper uses destructive/10 background", () => {
    const result = render();
    const iconWrapper = result.props.children[0] as {
      props: { className: string };
    };
    expect(iconWrapper.props.className).toContain("bg-destructive/10");
  });
});

describe("ErrorState — default title and message", () => {
  it("renders default title when not provided", () => {
    const result = render();
    const textContainer = result.props.children[1] as {
      props: { children: unknown[] };
    };
    const titleEl = textContainer.props.children[0] as {
      props: { children: string; "data-slot": string };
    };
    expect(titleEl.props.children).toBe("Something went wrong");
    expect(titleEl.props["data-slot"]).toBe("error-state-title");
  });

  it("renders default message when not provided", () => {
    const result = render();
    const textContainer = result.props.children[1] as {
      props: { children: unknown[] };
    };
    const msgEl = textContainer.props.children[1] as {
      props: { children: string; "data-slot": string };
    };
    expect(msgEl.props.children).toBe("An unexpected error occurred. Please try again.");
    expect(msgEl.props["data-slot"]).toBe("error-state-message");
  });
});

describe("ErrorState — custom title and message", () => {
  it("renders custom title when provided", () => {
    const result = render({ title: "Database error" });
    const textContainer = result.props.children[1] as {
      props: { children: unknown[] };
    };
    const titleEl = textContainer.props.children[0] as {
      props: { children: string };
    };
    expect(titleEl.props.children).toBe("Database error");
  });

  it("renders custom message when provided", () => {
    const result = render({ message: "Could not reach the server." });
    const textContainer = result.props.children[1] as {
      props: { children: unknown[] };
    };
    const msgEl = textContainer.props.children[1] as {
      props: { children: string };
    };
    expect(msgEl.props.children).toBe("Could not reach the server.");
  });
});

describe("ErrorState — onReset button", () => {
  it("renders reset button when onReset is provided", () => {
    const onReset = vi.fn();
    const result = render({ onReset });
    const resetBtn = result.props.children[2] as {
      props: { "data-slot": string; onClick: () => void };
    };
    expect(resetBtn).toBeTruthy();
    expect(resetBtn.props["data-slot"]).toBe("error-state-reset");
    expect(typeof resetBtn.props.onClick).toBe("function");
  });

  it("does not render reset button when onReset is omitted", () => {
    const result = render();
    expect(result.props.children[2]).toBeFalsy();
  });
});
