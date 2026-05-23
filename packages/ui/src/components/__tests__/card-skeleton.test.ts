/**
 * CardSkeleton — unit tests
 *
 * Tests the CardSkeleton component (T-13):
 * - root element has correct data-slot
 * - default layout classes applied
 * - custom className merged correctly
 * - renders Skeleton children (structural check)
 */

import { describe, expect, it } from "vitest";
import { CardSkeleton } from "../card-skeleton";

function render(props: Parameters<typeof CardSkeleton>[0] = {}) {
  return CardSkeleton(props) as {
    props: {
      "data-slot": string;
      className: string;
      children: unknown[];
    };
  };
}

describe("CardSkeleton — root element", () => {
  it("has data-slot=card-skeleton", () => {
    const result = render();
    expect(result.props["data-slot"]).toBe("card-skeleton");
  });

  it("includes rounded-xl and bg-card classes", () => {
    const result = render();
    expect(result.props.className).toContain("rounded-xl");
    expect(result.props.className).toContain("bg-card");
  });

  it("merges custom className", () => {
    const result = render({ className: "col-span-2" });
    expect(result.props.className).toContain("col-span-2");
  });
});

describe("CardSkeleton — structure", () => {
  it("renders three structural sections (header, content, footer)", () => {
    const result = render();
    // Root has 3 children: header, content, footer sections
    expect(Array.isArray(result.props.children)).toBe(true);
    expect(result.props.children.length).toBe(3);
  });
});
