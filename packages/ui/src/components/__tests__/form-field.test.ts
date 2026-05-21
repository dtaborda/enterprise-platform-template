// @vitest-environment happy-dom
/**
 * FormField — unit tests
 *
 * FormField uses `useId`, `cloneElement`, and renders Label + optional
 * FormMessage. We render it with ReactDOM.createRoot + act() using the
 * happy-dom environment.
 *
 * Scenarios:
 * - No error state: no FormMessage, no aria-invalid, no aria-describedby
 * - Field error present: FormMessage renders, aria-invalid set, aria-describedby links error id
 * - required=true: label shows " *" indicator
 */

import type { ActionResult } from "@enterprise/contracts";
import { act, createElement, type ReactElement } from "react";
import * as ReactDOM from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderTree(tree: ReactElement): { container: HTMLDivElement; root: ReactDOM.Root } {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = ReactDOM.createRoot(container);
  act(() => {
    root.render(tree);
  });
  return { container, root };
}

/** Build a FormField element with an `<input>` child — avoids TS children-in-props noise */
function field(
  Comp: typeof import("../form-field").FormField,
  props: { name: string; label: string; state: ActionResult | null; required?: boolean },
): ReactElement {
  // Cast to `never` to satisfy createElement overload — children is the third arg
  return createElement(Comp, props as never, createElement("input", { type: "text" }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("FormField", () => {
  let FormField: typeof import("../form-field").FormField;
  const cleanup: Array<() => void> = [];

  beforeEach(async () => {
    const mod = await import("../form-field");
    FormField = mod.FormField;
  });

  afterEach(() => {
    for (const fn of cleanup) fn();
    cleanup.length = 0;
  });

  it("no error state: no FormMessage rendered, no aria-invalid attribute", () => {
    const { container, root } = renderTree(
      field(FormField, { name: "email", label: "Email", state: null }),
    );
    cleanup.push(() => act(() => root.unmount()));

    // No role="alert" element (FormMessage not rendered)
    const alert = container.querySelector("[role='alert']");
    expect(alert).toBeNull();

    // Input does not have aria-invalid
    const input = container.querySelector("input");
    expect(input?.getAttribute("aria-invalid")).toBeNull();
  });

  it("field error present: FormMessage renders, aria-invalid set, aria-describedby links to error id", () => {
    const state: ActionResult = {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Please fix the errors below.",
        details: { email: ["Must be a valid email address"] },
      },
    };

    const { container, root } = renderTree(
      field(FormField, { name: "email", label: "Email", state }),
    );
    cleanup.push(() => act(() => root.unmount()));

    // FormMessage is rendered (role="alert")
    const alert = container.querySelector("[role='alert']");
    expect(alert).not.toBeNull();
    expect(alert?.textContent).toBe("Must be a valid email address");

    // Input has aria-invalid="true"
    const input = container.querySelector("input");
    expect(input?.getAttribute("aria-invalid")).toBe("true");

    // aria-describedby on input references the error element's id
    const describedBy = input?.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(alert?.id).toBe(describedBy);
  });

  it("required=true: label shows ' *' indicator", () => {
    const { container, root } = renderTree(
      field(FormField, { name: "email", label: "Email", state: null, required: true }),
    );
    cleanup.push(() => act(() => root.unmount()));

    const label = container.querySelector("label");
    expect(label?.textContent).toContain("*");
  });

  it("required=false (default): label does not show ' *' indicator", () => {
    const { container, root } = renderTree(
      field(FormField, { name: "email", label: "Email", state: null }),
    );
    cleanup.push(() => act(() => root.unmount()));

    const label = container.querySelector("label");
    expect(label?.textContent).not.toContain("*");
  });
});
