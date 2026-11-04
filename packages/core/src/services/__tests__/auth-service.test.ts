import { USER_ROLE } from "@enterprise/contracts";
import { describe, expect, it, vi } from "vitest";
import {
  type PasswordResetServiceInput,
  requestPasswordResetService,
  resolveRoleRedirectPath,
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

  describe("resolveRoleRedirectPath", () => {
    /**
     * GUARD TEST — protects a performance optimization in ui/middleware.ts.
     *
     * The middleware no longer looks up the authenticated user's role before
     * computing their home path. That is only correct while EVERY role resolves
     * to the SAME path, which makes the lookup a guaranteed-constant database
     * round trip.
     *
     * If this test fails, role home paths have diverged and the optimization is
     * no longer safe: ui/middleware.ts MUST go back to a per-user role lookup
     * (getUserRoleService) before the differing role can ship.
     *
     * Roles are read from USER_ROLE so a newly added role is covered automatically.
     */
    const ALL_ROLES = Object.values(USER_ROLE);

    it("returns an identical home path for every role, null, and undefined", () => {
      const expectedHome = resolveRoleRedirectPath(null);
      const resolvedPaths = ALL_ROLES.map((role) => resolveRoleRedirectPath(role));
      const distinctPaths = new Set([
        ...resolvedPaths,
        resolveRoleRedirectPath(null),
        resolveRoleRedirectPath(undefined),
      ]);

      expect(
        distinctPaths.size,
        `Role home paths diverged: ${JSON.stringify(
          Object.fromEntries(ALL_ROLES.map((role, i) => [role, resolvedPaths[i]])),
        )}. ui/middleware.ts skips the per-user role lookup because all roles share one home. Restore getUserRoleService in ui/middleware.ts before shipping a role with a different home path.`,
      ).toBe(1);

      expect(distinctPaths.has(expectedHome)).toBe(true);
    });

    it("covers every role declared in USER_ROLE", () => {
      expect(ALL_ROLES).toEqual(expect.arrayContaining(["owner", "admin", "member", "guest"]));
      expect(ALL_ROLES.length).toBeGreaterThanOrEqual(4);
    });
  });
});
