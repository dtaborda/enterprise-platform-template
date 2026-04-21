import { expect } from "vitest";

export const REDIRECT_SENTINEL = "NEXT_REDIRECT_SENTINEL";

export function createRedirectError(path: string): Error & { digest: string } {
  const error = new Error(`redirect:${path}`) as Error & { digest: string };
  error.digest = `${REDIRECT_SENTINEL};${path}`;
  return error;
}

export function expectRedirectError(error: unknown, path: string): void {
  if (!(error instanceof Error)) {
    throw new Error("Expected redirect error to be an Error instance");
  }

  const redirectError = error as Error & { digest?: string };
  expect(redirectError.digest).toContain(`${REDIRECT_SENTINEL};${path}`);
}
