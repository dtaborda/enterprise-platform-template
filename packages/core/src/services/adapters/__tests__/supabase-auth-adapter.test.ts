/**
 * supabase-auth-adapter.test.ts — TDD: validates SupabaseAuthAdapter maps Supabase SDK
 * responses to ServiceResult<T> correctly.
 *
 * These tests DO use a Supabase client mock — this is appropriate because adapter tests
 * are explicitly testing the Supabase mapping, not business logic.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { SupabaseAuthAdapter } from "../supabase-auth-adapter";

function createMockSupabaseClient() {
  const mockSingle = vi.fn();

  return {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      signUp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockSingle,
        })),
      })),
    })),
    __mockSingle: mockSingle,
  } as unknown as SupabaseClient & { __mockSingle: ReturnType<typeof vi.fn> };
}

describe("SupabaseAuthAdapter", () => {
  describe("signInWithPassword", () => {
    it("maps Supabase error to INVALID_CREDENTIALS", async () => {
      const client = createMockSupabaseClient();
      const adapter = new SupabaseAuthAdapter(client);

      vi.mocked(client.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid login credentials" } as never,
      } as never);

      const result = await adapter.signInWithPassword({
        email: "user@example.com",
        password: "wrong-password",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("INVALID_CREDENTIALS");
        expect(result.error).toBe("Invalid credentials");
      }
    });

    it("returns success with role after successful sign-in", async () => {
      const client = createMockSupabaseClient();
      const adapter = new SupabaseAuthAdapter(client);

      vi.mocked(client.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      } as never);
      vi.mocked(client.auth.getUser).mockResolvedValue({
        data: { user: { id: "user-123", created_at: "2024-01-01" } },
        error: null,
      } as never);
      (client as typeof client & { __mockSingle: ReturnType<typeof vi.fn> }).__mockSingle.mockResolvedValue({
        data: { role: "member" },
        error: null,
      });

      const result = await adapter.signInWithPassword({
        email: "user@example.com",
        password: "correct-password",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe("member");
      }
    });

    it("returns USER_NOT_FOUND when user is null after sign-in", async () => {
      const client = createMockSupabaseClient();
      const adapter = new SupabaseAuthAdapter(client);

      vi.mocked(client.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      } as never);
      vi.mocked(client.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as never);

      const result = await adapter.signInWithPassword({
        email: "user@example.com",
        password: "password",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("USER_NOT_FOUND");
      }
    });
  });

  describe("getUserRole", () => {
    it("returns guest role when PGRST116 error (profile not found)", async () => {
      const client = createMockSupabaseClient();
      const adapter = new SupabaseAuthAdapter(client);

      (client as typeof client & { __mockSingle: ReturnType<typeof vi.fn> }).__mockSingle.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Row not found" },
      });

      const result = await adapter.getUserRole("non-existent-user-id");

      // PGRST116 is NOT an error — it means profile doesn't exist, default to guest
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe("guest");
      }
    });

    it("returns ROLE_LOOKUP_FAILED for non-PGRST116 errors", async () => {
      const client = createMockSupabaseClient();
      const adapter = new SupabaseAuthAdapter(client);

      (client as typeof client & { __mockSingle: ReturnType<typeof vi.fn> }).__mockSingle.mockResolvedValue({
        data: null,
        error: { code: "NETWORK_ERROR", message: "Connection refused" },
      });

      const result = await adapter.getUserRole("user-123");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("ROLE_LOOKUP_FAILED");
      }
    });
  });

  describe("signOut", () => {
    it("returns success with null data", async () => {
      const client = createMockSupabaseClient();
      const adapter = new SupabaseAuthAdapter(client);

      vi.mocked(client.auth.signOut).mockResolvedValue({ error: null } as never);

      const result = await adapter.signOut();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it("returns SIGN_OUT_FAILED on error", async () => {
      const client = createMockSupabaseClient();
      const adapter = new SupabaseAuthAdapter(client);

      vi.mocked(client.auth.signOut).mockResolvedValue({
        error: { message: "Failed to sign out" } as never,
      } as never);

      const result = await adapter.signOut();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("SIGN_OUT_FAILED");
      }
    });
  });

  describe("signUp", () => {
    it("returns needsEmailConfirmation: true when session is null", async () => {
      const client = createMockSupabaseClient();
      const adapter = new SupabaseAuthAdapter(client);

      vi.mocked(client.auth.signUp).mockResolvedValue({
        data: {
          user: { id: "new-user-id", created_at: "2024-01-01" },
          session: null,
        },
        error: null,
      } as never);

      const result = await adapter.signUp({
        email: "new@example.com",
        password: "Password123",
        metadata: { name: "New User" },
        emailRedirectTo: "http://localhost/auth/callback",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.needsEmailConfirmation).toBe(true);
        expect(result.data.userId).toBe("new-user-id");
      }
    });

    it("returns needsEmailConfirmation: false when session exists", async () => {
      const client = createMockSupabaseClient();
      const adapter = new SupabaseAuthAdapter(client);

      vi.mocked(client.auth.signUp).mockResolvedValue({
        data: {
          user: { id: "new-user-id", created_at: "2024-01-01" },
          session: { access_token: "token" },
        },
        error: null,
      } as never);

      const result = await adapter.signUp({
        email: "new@example.com",
        password: "Password123",
        metadata: { name: "New User" },
        emailRedirectTo: "http://localhost/auth/callback",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.needsEmailConfirmation).toBe(false);
      }
    });

    it("returns SIGN_UP_FAILED on SDK error", async () => {
      const client = createMockSupabaseClient();
      const adapter = new SupabaseAuthAdapter(client);

      vi.mocked(client.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Email already registered" } as never,
      } as never);

      const result = await adapter.signUp({
        email: "existing@example.com",
        password: "Password123",
        metadata: { name: "User" },
        emailRedirectTo: "http://localhost/auth/callback",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("SIGN_UP_FAILED");
      }
    });
  });

  describe("requestPasswordReset", () => {
    it("returns success with null data", async () => {
      const client = createMockSupabaseClient();
      const adapter = new SupabaseAuthAdapter(client);

      vi.mocked(client.auth.resetPasswordForEmail).mockResolvedValue({
        data: {},
        error: null,
      } as never);

      const result = await adapter.requestPasswordReset({
        email: "user@example.com",
        redirectTo: "http://localhost/auth/callback?next=/reset-password",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it("returns PASSWORD_RESET_REQUEST_FAILED on error", async () => {
      const client = createMockSupabaseClient();
      const adapter = new SupabaseAuthAdapter(client);

      vi.mocked(client.auth.resetPasswordForEmail).mockResolvedValue({
        data: {},
        error: { message: "Rate limit exceeded" } as never,
      } as never);

      const result = await adapter.requestPasswordReset({
        email: "user@example.com",
        redirectTo: "http://localhost/auth/callback?next=/reset-password",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("PASSWORD_RESET_REQUEST_FAILED");
      }
    });
  });

  describe("updatePassword", () => {
    it("returns success with null data", async () => {
      const client = createMockSupabaseClient();
      const adapter = new SupabaseAuthAdapter(client);

      vi.mocked(client.auth.updateUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as never);

      const result = await adapter.updatePassword({ password: "NewPassword123" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it("returns PASSWORD_UPDATE_FAILED on error", async () => {
      const client = createMockSupabaseClient();
      const adapter = new SupabaseAuthAdapter(client);

      vi.mocked(client.auth.updateUser).mockResolvedValue({
        data: { user: null },
        error: { message: "Session expired" } as never,
      } as never);

      const result = await adapter.updatePassword({ password: "NewPassword123" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("PASSWORD_UPDATE_FAILED");
      }
    });
  });
});
