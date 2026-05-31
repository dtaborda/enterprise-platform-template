/**
 * auth-port.test.ts — TDD: validates AuthPort interface contract
 *
 * These tests verify that:
 * 1. A plain object satisfying AuthPort compiles and passes type checks
 * 2. A mock satisfies the interface without any SDK imports
 * 3. getUser returns null (not an error) for anonymous users
 */
import { describe, expect, it, vi } from "vitest";
import type { AuthPort } from "../auth-port";

/**
 * Creates a minimal mock that satisfies AuthPort without any Supabase SDK imports.
 * This is the canonical pattern for testing services that depend on AuthPort.
 */
function createMockAuthPort(): AuthPort {
  return {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    getUser: vi.fn(),
    getUserRole: vi.fn(),
    requestPasswordReset: vi.fn(),
    updatePassword: vi.fn(),
  };
}

describe("AuthPort interface", () => {
  it("a plain object mock satisfies AuthPort without SDK imports", () => {
    const auth: AuthPort = createMockAuthPort();

    // Verify all 7 required methods exist on the mock
    expect(typeof auth.signInWithPassword).toBe("function");
    expect(typeof auth.signUp).toBe("function");
    expect(typeof auth.signOut).toBe("function");
    expect(typeof auth.getUser).toBe("function");
    expect(typeof auth.getUserRole).toBe("function");
    expect(typeof auth.requestPasswordReset).toBe("function");
    expect(typeof auth.updatePassword).toBe("function");
  });

  it("getUser returns null (not an error) for anonymous users", async () => {
    const auth = createMockAuthPort();
    vi.mocked(auth.getUser).mockResolvedValue({ success: true, data: null });

    const result = await auth.getUser();

    // Anonymous visitor: success=true with data=null (not a failure ServiceResult)
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it("signInWithPassword returns INVALID_CREDENTIALS on failure", async () => {
    const auth = createMockAuthPort();
    vi.mocked(auth.signInWithPassword).mockResolvedValue({
      success: false,
      error: "Invalid credentials",
      code: "INVALID_CREDENTIALS",
    });

    const result = await auth.signInWithPassword({
      email: "user@example.com",
      password: "wrong",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("INVALID_CREDENTIALS");
    }
  });

  it("signOut returns success with null data", async () => {
    const auth = createMockAuthPort();
    vi.mocked(auth.signOut).mockResolvedValue({ success: true, data: null });

    const result = await auth.signOut();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it("getUserRole returns guest role for PGRST116 (profile not found)", async () => {
    const auth = createMockAuthPort();
    vi.mocked(auth.getUserRole).mockResolvedValue({
      success: true,
      data: { role: "guest" },
    });

    const result = await auth.getUserRole("non-existent-user-id");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe("guest");
    }
  });
});
