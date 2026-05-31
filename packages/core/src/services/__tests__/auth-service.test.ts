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
import { createMockAuthPort } from "./mocks/auth-port.mock";

describe("auth-service", () => {
  describe("signInWithPasswordService", () => {
    it("success returns { success: true, data: { role } } for profile role", async () => {
      const auth = createMockAuthPort();
      vi.mocked(auth.signInWithPassword).mockResolvedValue({
        success: true,
        data: { role: "member" },
      });

      const result = await signInWithPasswordService(auth, {
        email: "member@enterprise.dev",
        password: "password123",
      });

      expect(result).toEqual({ success: true, data: { role: "member" } });
    });

    it("sign-in auth failure returns INVALID_CREDENTIALS", async () => {
      const auth = createMockAuthPort();
      vi.mocked(auth.signInWithPassword).mockResolvedValue({
        success: false,
        error: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      });

      const result = await signInWithPasswordService(auth, {
        email: "member@enterprise.dev",
        password: "wrong-password",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("INVALID_CREDENTIALS");
      }
    });

    it("missing user from auth returns USER_NOT_FOUND", async () => {
      const auth = createMockAuthPort();
      vi.mocked(auth.signInWithPassword).mockResolvedValue({
        success: false,
        error: "User not found after sign-in",
        code: "USER_NOT_FOUND",
      });

      const result = await signInWithPasswordService(auth, {
        email: "member@enterprise.dev",
        password: "password123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("USER_NOT_FOUND");
      }
    });

    it("role lookup failure returns ROLE_LOOKUP_FAILED", async () => {
      const auth = createMockAuthPort();
      vi.mocked(auth.signInWithPassword).mockResolvedValue({
        success: false,
        error: "Could not load user role",
        code: "ROLE_LOOKUP_FAILED",
      });

      const result = await signInWithPasswordService(auth, {
        email: "member@enterprise.dev",
        password: "password123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("ROLE_LOOKUP_FAILED");
      }
    });

    it("null/undefined profile role returns success with guest role", async () => {
      const auth = createMockAuthPort();
      vi.mocked(auth.signInWithPassword).mockResolvedValue({
        success: true,
        data: { role: "guest" },
      });

      const result = await signInWithPasswordService(auth, {
        email: "member@enterprise.dev",
        password: "password123",
      });

      expect(result).toEqual({ success: true, data: { role: "guest" } });
    });
  });

  describe("signOutService", () => {
    it("success returns { success: true, data: null }", async () => {
      const auth = createMockAuthPort();
      vi.mocked(auth.signOut).mockResolvedValue({ success: true, data: null });

      const result = await signOutService(auth);
      expect(result).toEqual({ success: true, data: null });
    });

    it("auth signOut error returns SIGN_OUT_FAILED", async () => {
      const auth = createMockAuthPort();
      vi.mocked(auth.signOut).mockResolvedValue({
        success: false,
        error: "Could not sign out",
        code: "SIGN_OUT_FAILED",
      });

      const result = await signOutService(auth);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("SIGN_OUT_FAILED");
      }
    });
  });

  describe("signUpService", () => {
    it("returns sign-up success with confirmation status", async () => {
      const auth = createMockAuthPort();
      vi.mocked(auth.signUp).mockResolvedValue({
        success: true,
        data: {
          userId: "fcb76509-16e5-4c56-8f70-17a018ec4d8d",
          needsEmailConfirmation: true,
        },
      });

      const input: SignUpServiceInput = {
        email: "test@example.com",
        password: "Password123",
        metadata: { name: "Test User" },
        emailRedirectTo: "http://localhost:3000/auth/callback",
      };

      const result = await signUpService(auth, input);

      expect(result).toEqual({
        success: true,
        data: {
          userId: "fcb76509-16e5-4c56-8f70-17a018ec4d8d",
          needsEmailConfirmation: true,
        },
      });
    });

    it("auth signUp error returns SIGN_UP_FAILED", async () => {
      const auth = createMockAuthPort();
      vi.mocked(auth.signUp).mockResolvedValue({
        success: false,
        error: "Could not create account",
        code: "SIGN_UP_FAILED",
      });

      const input: SignUpServiceInput = {
        email: "test@example.com",
        password: "Password123",
        metadata: { name: "Test User" },
        emailRedirectTo: "http://localhost:3000/auth/callback",
      };

      const result = await signUpService(auth, input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("SIGN_UP_FAILED");
      }
    });

    it("signUp result without user returns USER_NOT_CREATED", async () => {
      const auth = createMockAuthPort();
      vi.mocked(auth.signUp).mockResolvedValue({
        success: false,
        error: "User was not created",
        code: "USER_NOT_CREATED",
      });

      const input: SignUpServiceInput = {
        email: "test@example.com",
        password: "Password123",
        metadata: { name: "Test User" },
        emailRedirectTo: "http://localhost:3000/auth/callback",
      };

      const result = await signUpService(auth, input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("USER_NOT_CREATED");
      }
    });

    it("signUp with non-null session sets needsEmailConfirmation: false", async () => {
      const auth = createMockAuthPort();
      vi.mocked(auth.signUp).mockResolvedValue({
        success: true,
        data: {
          userId: "fcb76509-16e5-4c56-8f70-17a018ec4d8d",
          needsEmailConfirmation: false,
        },
      });

      const input: SignUpServiceInput = {
        email: "test@example.com",
        password: "Password123",
        metadata: { name: "Test User" },
        emailRedirectTo: "http://localhost:3000/auth/callback",
      };

      const result = await signUpService(auth, input);

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
      const auth = createMockAuthPort();
      vi.mocked(auth.requestPasswordReset).mockResolvedValue({
        success: true,
        data: null,
      });

      const input: PasswordResetServiceInput = {
        email: "test@example.com",
        redirectTo: "http://localhost:3000/auth/callback?next=/reset-password",
      };

      const result = await requestPasswordResetService(auth, input);
      expect(result).toEqual({ success: true, data: null });
    });

    it("returns reset-password service failure when provider fails", async () => {
      const auth = createMockAuthPort();
      vi.mocked(auth.requestPasswordReset).mockResolvedValue({
        success: false,
        error: "Could not send password reset email",
        code: "PASSWORD_RESET_REQUEST_FAILED",
      });

      const input: PasswordResetServiceInput = {
        email: "test@example.com",
        redirectTo: "http://localhost:3000/auth/callback?next=/reset-password",
      };

      const result = await requestPasswordResetService(auth, input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("PASSWORD_RESET_REQUEST_FAILED");
      }
    });
  });

  describe("updatePasswordService", () => {
    it("updates password successfully", async () => {
      const auth = createMockAuthPort();
      vi.mocked(auth.updatePassword).mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await updatePasswordService(auth, {
        password: "Password123",
      });

      expect(result).toEqual({ success: true, data: null });
    });

    it("auth update error returns PASSWORD_UPDATE_FAILED", async () => {
      const auth = createMockAuthPort();
      vi.mocked(auth.updatePassword).mockResolvedValue({
        success: false,
        error: "Could not update password",
        code: "PASSWORD_UPDATE_FAILED",
      });

      const result = await updatePasswordService(auth, {
        password: "Password123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("PASSWORD_UPDATE_FAILED");
      }
    });
  });
});
