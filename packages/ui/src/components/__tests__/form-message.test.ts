/**
 * FormMessage — unit tests
 *
 * The component has simple conditional render logic.
 * We invoke it directly as a function (valid in React 19 / RSC-style testing)
 * and inspect the returned React element's props.
 *
 * No DOM required — node environment is sufficient.
 */
import { describe, expect, it } from "vitest";
import { FormMessage } from "../form-message";

describe("FormMessage", () => {
  it("returns null when children is falsy (empty string)", () => {
    const result = FormMessage({ children: "" });
    expect(result).toBeNull();
  });

  it("returns null when children is undefined", () => {
    const result = FormMessage({ children: undefined });
    expect(result).toBeNull();
  });

  it("returns null when children is false", () => {
    const result = FormMessage({ children: false });
    expect(result).toBeNull();
  });

  it("returns a React element with role='alert' when children is a non-empty string", () => {
    const result = FormMessage({ children: "This field is required." });
    expect(result).not.toBeNull();
    // React element is a plain object with { type, props, ... }
    expect(result).toMatchObject({ props: { role: "alert" } });
  });

  it("returned element has text-xs and text-destructive classes", () => {
    const result = FormMessage({ children: "Error text" });
    expect(result).not.toBeNull();
    const className: string = (result as { props: { className: string } }).props.className;
    expect(className).toContain("text-xs");
    expect(className).toContain("text-destructive");
  });

  it("passes id prop to the rendered element", () => {
    const result = FormMessage({ children: "Error", id: "email-error" });
    expect(result).toMatchObject({ props: { id: "email-error" } });
  });
});
