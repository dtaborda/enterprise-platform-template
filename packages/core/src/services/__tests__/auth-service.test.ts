import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  type PasswordResetServiceInput,
  requestPasswordResetService,
  type SignUpServiceInput,
  signInWithPasswordService,
  signOutService,
  signUpService,
  updatePasswordService,
} from "../auth-service";

function createMockClient() {
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
  } as unknown as SupabaseClient;
}

describe("auth-service", () => {
  describe("signInWithPasswordService", () => {
    it("success returns { success: true, data: { role } } for profile role", async () => {
      const client = createMockClient() as SupabaseClient & {
        __mockSingle: ReturnType<typeof vi.fn>;
      };
      const signInMock = vi.mocked(client.auth.signInWithPassword);
      const getUserMock = vi.mocked(client.auth.getUser);

      signInMock.mockResolvedValue({ data: { user: null, session: null }, error: null } as never);
      getUserMock.mockResolvedValue({
        data: {
          user: {
            id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          },
        },
      } as never);
      client.__mockSingle.mockResolvedValue({ data: { role: "member" }, error: null });

      const result = await signInWithPasswordService(client, {
        email: "member@enterprise.dev",
        password: "password123",
      });

      expect(result).toEqual({ success: true, data: { role: "member" } });
    });

    it("sign-in auth failure returns INVALID_CREDENTIALS", async () => {
      const client = createMockClient() as SupabaseClient & {
        __mockSingle: ReturnType<typeof vi.fn>;
      };
      const signInMock = vi.mocked(client.auth.signInWithPassword);

      signInMock.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "no" },
      } as never);

      const result = await signInWithPasswordService(client, {
        email: "member@enterprise.dev",
        password: "wrong-password",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("INVALID_CREDENTIALS");
      }
    });

    it("missing user from auth.getUser() returns USER_NOT_FOUND", async () => {
      const client = createMockClient() as SupabaseClient & {
        __mockSingle: ReturnType<typeof vi.fn>;
      };
      const signInMock = vi.mocked(client.auth.signInWithPassword);
      const getUserMock = vi.mocked(client.auth.getUser);

      signInMock.mockResolvedValue({ data: { user: null, session: null }, error: null } as never);
      getUserMock.mockResolvedValue({ data: { user: null } } as never);

      const result = await signInWithPasswordService(client, {
        email: "member@enterprise.dev",
        password: "password123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("USER_NOT_FOUND");
      }
    });

    it("profile query error returns ROLE_LOOKUP_FAILED", async () => {
      const client = createMockClient() as SupabaseClient & {
        __mockSingle: ReturnType<typeof vi.fn>;
      };
      const signInMock = vi.mocked(client.auth.signInWithPassword);
      const getUserMock = vi.mocked(client.auth.getUser);

      signInMock.mockResolvedValue({ data: { user: null, session: null }, error: null } as never);
      getUserMock.mockResolvedValue({
        data: { user: { id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" } },
      } as never);
      client.__mockSingle.mockResolvedValue({ data: null, error: { message: "missing" } });

      const result = await signInWithPasswordService(client, {
        email: "member@enterprise.dev",
        password: "password123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("ROLE_LOOKUP_FAILED");
      }
    });

    it("null/undefined profile role returns success with guest role", async () => {
      const client = createMockClient() as SupabaseClient & {
        __mockSingle: ReturnType<typeof vi.fn>;
      };
      const signInMock = vi.mocked(client.auth.signInWithPassword);
      const getUserMock = vi.mocked(client.auth.getUser);

      signInMock.mockResolvedValue({ data: { user: null, session: null }, error: null } as never);
      getUserMock.mockResolvedValue({
        data: { user: { id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" } },
      } as never);
      client.__mockSingle.mockResolvedValue({ data: {}, error: null });

      const result = await signInWithPasswordService(client, {
        email: "member@enterprise.dev",
        password: "password123",
      });

      expect(result).toEqual({ success: true, data: { role: "guest" } });
    });
  });

  describe("signOutService", () => {
    it("success returns { success: true, data: null }", async () => {
      const client = createMockClient();
      const signOutMock = vi.mocked(client.auth.signOut);

      signOutMock.mockResolvedValue({ error: null } as never);

      const result = await signOutService(client);
      expect(result).toEqual({ success: true, data: null });
    });

    it("auth signOut error returns SIGN_OUT_FAILED", async () => {
      const client = createMockClient();
      const signOutMock = vi.mocked(client.auth.signOut);

      signOutMock.mockResolvedValue({ error: { message: "failed" } } as never);

      const result = await signOutService(client);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("SIGN_OUT_FAILED");
      }
    });
  });

  describe("signUpService", () => {
    it("returns sign-up success with confirmation status", async () => {
      const client = createMockClient();
      const signUpMock = vi.mocked(client.auth.signUp);

      signUpMock.mockResolvedValue({
        data: {
          user: { id: "fcb76509-16e5-4c56-8f70-17a018ec4d8d" },
          session: null,
        },
        error: null,
      } as never);

      const input: SignUpServiceInput = {
        email: "test@example.com",
        password: "Password123",
        metadata: { name: "Test User" },
        emailRedirectTo: "http://localhost:3000/auth/callback",
      };

      const result = await signUpService(client, input);

      expect(result).toEqual({
        success: true,
        data: {
          userId: "fcb76509-16e5-4c56-8f70-17a018ec4d8d",
          needsEmailConfirmation: true,
        },
      });
    });

    it("auth signUp error returns SIGN_UP_FAILED", async () => {
      const client = createMockClient();
      const signUpMock = vi.mocked(client.auth.signUp);

      signUpMock.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "failed" },
      } as never);

      const input: SignUpServiceInput = {
        email: "test@example.com",
        password: "Password123",
        metadata: { name: "Test User" },
        emailRedirectTo: "http://localhost:3000/auth/callback",
      };

      const result = await signUpService(client, input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("SIGN_UP_FAILED");
      }
    });

    it("signUp result without user returns USER_NOT_CREATED", async () => {
      const client = createMockClient();
      const signUpMock = vi.mocked(client.auth.signUp);

      signUpMock.mockResolvedValue({ data: { user: null, session: null }, error: null } as never);

      const input: SignUpServiceInput = {
        email: "test@example.com",
        password: "Password123",
        metadata: { name: "Test User" },
        emailRedirectTo: "http://localhost:3000/auth/callback",
      };

      const result = await signUpService(client, input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("USER_NOT_CREATED");
      }
    });

    it("signUp with non-null session sets needsEmailConfirmation: false", async () => {
      const client = createMockClient();
      const signUpMock = vi.mocked(client.auth.signUp);

      signUpMock.mockResolvedValue({
        data: {
          user: { id: "fcb76509-16e5-4c56-8f70-17a018ec4d8d" },
          session: { access_token: "token" },
        },
        error: null,
      } as never);

      const input: SignUpServiceInput = {
        email: "test@example.com",
        password: "Password123",
        metadata: { name: "Test User" },
        emailRedirectTo: "http://localhost:3000/auth/callback",
      };

      const result = await signUpService(client, input);

      expect(result).toEqual({
        success: true,
        data: {
          userId: "fcb76509-16e5-4c56-8f70-17a018ec4d8d",
          needsEmailConfirmation: false,
        },
      });
    });
  });

  describe("requestPasswordResetService", () => {
    it("success returns { success: true, data: null }", async () => {
      const client = createMockClient();
      const resetMock = vi.mocked(client.auth.resetPasswordForEmail);

      resetMock.mockResolvedValue({ data: {}, error: null } as never);

      const input: PasswordResetServiceInput = {
        email: "test@example.com",
        redirectTo: "http://localhost:3000/auth/callback?next=/reset-password",
      };

      const result = await requestPasswordResetService(client, input);
      expect(result).toEqual({ success: true, data: null });
    });

    it("returns reset-password service failure when provider fails", async () => {
      const client = createMockClient();
      const resetMock = vi.mocked(client.auth.resetPasswordForEmail);

      resetMock.mockResolvedValue({
        data: {},
        error: { message: "failure" },
      } as never);

      const input: PasswordResetServiceInput = {
        email: "test@example.com",
        redirectTo: "http://localhost:3000/auth/callback?next=/reset-password",
      };

      const result = await requestPasswordResetService(client, input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("PASSWORD_RESET_REQUEST_FAILED");
      }
    });
  });

  describe("updatePasswordService", () => {
    it("updates password successfully", async () => {
      const client = createMockClient();
      const updateUserMock = vi.mocked(client.auth.updateUser);

      updateUserMock.mockResolvedValue({
        data: { user: null },
        error: null,
      } as never);

      const result = await updatePasswordService(client, {
        password: "Password123",
      });

      expect(result).toEqual({ success: true, data: null });
    });

    it("auth update error returns PASSWORD_UPDATE_FAILED", async () => {
      const client = createMockClient();
      const updateUserMock = vi.mocked(client.auth.updateUser);

      updateUserMock.mockResolvedValue({
        data: { user: null },
        error: { message: "failed" },
      } as never);

      const result = await updatePasswordService(client, {
        password: "Password123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("PASSWORD_UPDATE_FAILED");
      }
    });
  });
});
