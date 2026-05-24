/**
 * TableSkeleton — unit tests
 *
 * Tests the TableSkeleton component (T-14):
 * - root element has correct data-slot
 * - default layout classes applied
 * - custom className merged correctly
 * - rows and columns props control structure
 */

import { describe, expect, it } from "vitest";
import { TableSkeleton } from "../table-skeleton";

function render(props: Parameters<typeof TableSkeleton>[0] = {}) {
  return TableSkeleton(props) as {
    props: {
      "data-slot": string;
      className: string;
      children: unknown[];
    };
  };
}

describe("TableSkeleton — root element", () => {
  it("has data-slot=table-skeleton", () => {
    const result = render();
    expect(result.props["data-slot"]).toBe("table-skeleton");
  });

  it("includes rounded-xl and bg-card classes", () => {
    const result = render();
    expect(result.props.className).toContain("rounded-xl");
    expect(result.props.className).toContain("bg-card");
  });

  it("merges custom className", () => {
    const result = render({ className: "mt-4" });
    expect(result.props.className).toContain("mt-4");
  });
});

describe("TableSkeleton — structure", () => {
  it("renders two structural sections (header + rows)", () => {
    const result = render();
    // Root has 2 children: header row section + body rows section
    expect(result.props.children.length).toBe(2);
  });

  it("renders correct number of row children in body section", () => {
    const result = render({ rows: 3 });
    const bodySection = result.props.children[1] as {
      props: { children: unknown[] };
    };
    expect(bodySection.props.children.length).toBe(3);
  });

  it("defaults to 5 rows", () => {
    const result = render();
    const bodySection = result.props.children[1] as {
      props: { children: unknown[] };
    };
    expect(bodySection.props.children.length).toBe(5);
  });

  it("renders correct number of column skeletons in header", () => {
    const result = render({ columns: 3 });
    const headerSection = result.props.children[0] as {
      props: { children: { props: { children: unknown[] } } };
    };
    const headerRow = headerSection.props.children;
    expect(headerRow.props.children.length).toBe(3);
  });
});
