import { describe, expect, it, vi } from "vitest";
import { createMockAuthPort } from "./auth-port.mock";

describe("createMockAuthPort", () => {
  it("returns an object with all AuthPort methods as vi.fn() stubs", () => {
    const auth = createMockAuthPort();

    expect(typeof auth.signInWithPassword).toBe("function");
    expect(typeof auth.signUp).toBe("function");
    expect(typeof auth.signOut).toBe("function");
    expect(typeof auth.getUser).toBe("function");
    expect(typeof auth.getUserRole).toBe("function");
    expect(typeof auth.requestPasswordReset).toBe("function");
    expect(typeof auth.updatePassword).toBe("function");
  });

  it("stubs are independently mockable via vi.mocked()", async () => {
    const auth = createMockAuthPort();

    vi.mocked(auth.signOut).mockResolvedValue({ success: true, data: null });

    const result = await auth.signOut();
    expect(result).toEqual({ success: true, data: null });
  });

  it("returns a fresh instance each call (no shared state)", () => {
    const auth1 = createMockAuthPort();
    const auth2 = createMockAuthPort();

    expect(auth1.signInWithPassword).not.toBe(auth2.signInWithPassword);
  });

  it("stubs start with zero call count", () => {
    const auth = createMockAuthPort();

    expect(vi.mocked(auth.signInWithPassword).mock.calls).toHaveLength(0);
    expect(vi.mocked(auth.signUp).mock.calls).toHaveLength(0);
    expect(vi.mocked(auth.signOut).mock.calls).toHaveLength(0);
    expect(vi.mocked(auth.getUser).mock.calls).toHaveLength(0);
    expect(vi.mocked(auth.getUserRole).mock.calls).toHaveLength(0);
    expect(vi.mocked(auth.requestPasswordReset).mock.calls).toHaveLength(0);
    expect(vi.mocked(auth.updatePassword).mock.calls).toHaveLength(0);
  });
});
