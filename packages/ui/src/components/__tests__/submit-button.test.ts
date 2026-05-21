// @vitest-environment happy-dom
/**
 * SubmitButton — unit tests
 *
 * SubmitButton uses `useFormStatus()` from react-dom.
 * We mock react-dom to control the pending state without needing a real form
 * submission context.
 *
 * Rendering uses ReactDOM.createRoot + act() — same pattern as provider.test.ts.
 *
 * Scenarios:
 * - Idle state: shows children text, button is NOT disabled
 * - Pending state: shows pendingText, button IS disabled
 */

import { act, createElement } from "react";
import * as ReactDOM from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock react-dom to control useFormStatus
// ---------------------------------------------------------------------------

const mockPending = { current: false };

vi.mock("react-dom", async (importOriginal) => {
  const original = await importOriginal<typeof import("react-dom")>();
  return {
    ...original,
    useFormStatus: () => ({ pending: mockPending.current, data: null, method: null, action: null }),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderTree(tree: React.ReactElement): { container: HTMLDivElement; root: ReactDOM.Root } {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = ReactDOM.createRoot(container);
  act(() => {
    root.render(tree);
  });
  return { container, root };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SubmitButton", () => {
  // Import after mock is in place
  let SubmitButton: typeof import("../submit-button").SubmitButton;
  const cleanup: Array<() => void> = [];

  beforeEach(async () => {
    const mod = await import("../submit-button");
    SubmitButton = mod.SubmitButton;
    mockPending.current = false;
  });

  afterEach(() => {
    for (const fn of cleanup) fn();
    cleanup.length = 0;
    vi.clearAllMocks();
  });

  it("idle state: renders children text and button is not disabled", () => {
    mockPending.current = false;
    const { container, root } = renderTree(createElement(SubmitButton, null, "Save changes"));
    cleanup.push(() => act(() => root.unmount()));

    const button = container.querySelector("button");
    expect(button).not.toBeNull();
    expect(button?.textContent).toBe("Save changes");
    expect(button?.disabled).toBe(false);
  });

  it("pending state: renders pendingText and button is disabled", () => {
    mockPending.current = true;
    const { container, root } = renderTree(
      createElement(SubmitButton, { pendingText: "Saving…" }, "Save changes"),
    );
    cleanup.push(() => act(() => root.unmount()));

    const button = container.querySelector("button");
    expect(button).not.toBeNull();
    expect(button?.textContent).toBe("Saving…");
    expect(button?.disabled).toBe(true);
  });

  it("pending state: uses default pendingText 'Saving…' when prop is omitted", () => {
    mockPending.current = true;
    const { container, root } = renderTree(createElement(SubmitButton, null, "Submit"));
    cleanup.push(() => act(() => root.unmount()));

    const button = container.querySelector("button");
    expect(button?.textContent).toBe("Saving…");
    expect(button?.disabled).toBe(true);
  });

  it("button has type='submit'", () => {
    mockPending.current = false;
    const { container, root } = renderTree(createElement(SubmitButton, null, "Go"));
    cleanup.push(() => act(() => root.unmount()));

    const button = container.querySelector("button");
    expect(button?.type).toBe("submit");
  });
});
