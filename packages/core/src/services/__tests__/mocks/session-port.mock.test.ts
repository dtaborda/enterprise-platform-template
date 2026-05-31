import { describe, expect, it, vi } from "vitest";
import { createMockSessionPort } from "./session-port.mock";

describe("createMockSessionPort", () => {
  it("returns an object with all SessionPort methods as vi.fn() stubs", () => {
    const session = createMockSessionPort();

    expect(typeof session.refreshSession).toBe("function");
  });

  it("stubs are independently mockable via vi.mocked()", async () => {
    const session = createMockSessionPort();

    const fakeResponse = { status: 200 } as unknown as import("next/server").NextResponse;
    vi.mocked(session.refreshSession).mockResolvedValue(fakeResponse);

    const fakeRequest = {} as import("next/server").NextRequest;
    const result = await session.refreshSession(fakeRequest);
    expect(result).toBe(fakeResponse);
  });

  it("returns a fresh instance each call (no shared state)", () => {
    const session1 = createMockSessionPort();
    const session2 = createMockSessionPort();

    expect(session1.refreshSession).not.toBe(session2.refreshSession);
  });

  it("stub starts with zero call count", () => {
    const session = createMockSessionPort();

    expect(vi.mocked(session.refreshSession).mock.calls).toHaveLength(0);
  });
});
