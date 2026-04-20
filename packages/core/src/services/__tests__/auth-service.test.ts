import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  requestPasswordResetService,
  signUpService,
  type PasswordResetServiceInput,
  type SignUpServiceInput,
  updatePasswordService,
} from "../auth-service";

function createMockClient() {
  return {
    auth: {
      signUp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
  } as unknown as SupabaseClient;
}

describe("auth-service", () => {
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
});
