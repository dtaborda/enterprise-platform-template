/**
 * FormSkeleton — unit tests
 *
 * Tests the FormSkeleton component (T-15):
 * - root element has correct data-slot
 * - default layout classes applied
 * - custom className merged correctly
 * - fields prop controls number of field rows
 * - submit area is always rendered
 *
 * Structure note: JSX renders {array expression} as the first child and the
 * submit <div> as the second child — so props.children has length 2.
 * The array of field rows lives at children[0].
 */

import { describe, expect, it } from "vitest";
import { FormSkeleton } from "../form-skeleton";

function render(props: Parameters<typeof FormSkeleton>[0] = {}) {
  return FormSkeleton(props) as {
    props: {
      "data-slot": string;
      className: string;
      children: [unknown[], { props: { className: string; children: unknown[] } }];
    };
  };
}

describe("FormSkeleton — root element", () => {
  it("has data-slot=form-skeleton", () => {
    const result = render();
    expect(result.props["data-slot"]).toBe("form-skeleton");
  });

  it("includes flex and gap-6 classes", () => {
    const result = render();
    expect(result.props.className).toContain("flex");
    expect(result.props.className).toContain("gap-6");
  });

  it("merges custom className", () => {
    const result = render({ className: "max-w-md" });
    expect(result.props.className).toContain("max-w-md");
  });
});

describe("FormSkeleton — structure", () => {
  it("renders 2 children: fields array + submit section", () => {
    const result = render();
    // children[0] = array of field rows, children[1] = submit area div
    expect(result.props.children.length).toBe(2);
  });

  it("renders correct number of field rows when using default (3 fields)", () => {
    const result = render();
    const fieldRows = result.props.children[0] as unknown[];
    expect(fieldRows.length).toBe(3);
  });

  it("renders correct number of field rows when fields prop provided", () => {
    const result = render({ fields: 5 });
    const fieldRows = result.props.children[0] as unknown[];
    expect(fieldRows.length).toBe(5);
  });

  it("each field row has data-slot=form-skeleton-field", () => {
    const result = render({ fields: 2 });
    const fieldRows = result.props.children[0] as Array<{
      props: { "data-slot": string };
    }>;
    // biome-ignore lint/style/noNonNullAssertion: test assertion — array length already asserted
    expect(fieldRows[0]!.props["data-slot"]).toBe("form-skeleton-field");
    // biome-ignore lint/style/noNonNullAssertion: test assertion — array length already asserted
    expect(fieldRows[1]!.props["data-slot"]).toBe("form-skeleton-field");
  });

  it("each field row contains 2 skeleton elements (label + input)", () => {
    const result = render({ fields: 1 });
    const fieldRows = result.props.children[0] as Array<{
      props: { children: unknown[] };
    }>;
    // label skeleton + input skeleton = 2 children
    // biome-ignore lint/style/noNonNullAssertion: test assertion — array length already asserted
    expect(fieldRows[0]!.props.children.length).toBe(2);
  });

  it("submit area is the second child with justify-end class", () => {
    const result = render();
    const submitArea = result.props.children[1] as {
      props: { className: string };
    };
    expect(submitArea.props.className).toContain("justify-end");
  });
});
