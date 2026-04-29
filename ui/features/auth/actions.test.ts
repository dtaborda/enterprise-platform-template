import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRedirectError, REDIRECT_SENTINEL } from "../../test-utils/redirect";

const {
  mockGetServerClient,
  mockSignInWithPasswordService,
  mockSignUpService,
  mockRequestPasswordResetService,
  mockSignOutService,
  mockUpdatePasswordService,
  mockResolveRoleRedirectPath,
  mockRedirect,
  mockNormalizeSafeRedirectPath,
  mockGetAppUrl,
} = vi.hoisted(() => ({
  mockGetServerClient: vi.fn(),
  mockSignInWithPasswordService: vi.fn(),
  mockSignUpService: vi.fn(),
  mockRequestPasswordResetService: vi.fn(),
  mockSignOutService: vi.fn(),
  mockUpdatePasswordService: vi.fn(),
  mockResolveRoleRedirectPath: vi.fn((role: string | null | undefined) =>
    role === "guest" ? "/" : "/dashboard",
  ),
  mockRedirect: vi.fn((path: string) => {
    throw createRedirectError(path);
  }),
  mockNormalizeSafeRedirectPath: vi.fn(
    (value: string | null | undefined, fallback = "/dashboard") => value ?? fallback,
  ),
  mockGetAppUrl: vi.fn(() => "http://localhost:3000"),
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("@enterprise/core/supabase/server", () => ({
  getServerClient: mockGetServerClient,
}));

vi.mock("@enterprise/core/utils/env", () => ({
  getAppUrl: mockGetAppUrl,
}));

vi.mock("@enterprise/core/services/auth-service", () => ({
  signInWithPasswordService: mockSignInWithPasswordService,
  signUpService: mockSignUpService,
  requestPasswordResetService: mockRequestPasswordResetService,
  signOutService: mockSignOutService,
  updatePasswordService: mockUpdatePasswordService,
  resolveRoleRedirectPath: mockResolveRoleRedirectPath,
}));

vi.mock("./redirects", () => ({
  normalizeSafeRedirectPath: mockNormalizeSafeRedirectPath,
}));

async function loadActions() {
  vi.resetModules();
  return import("./actions");
}

function buildFormData(values: Record<string, string>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }

  return formData;
}

function expectRedirectDigest(error: unknown, path: string): void {
  expect(error).toMatchObject({
    digest: `${REDIRECT_SENTINEL};${path}`,
  });
}

describe("actions", () => {
  const mockClient = { auth: {} };

  beforeEach(() => {
    mockGetServerClient.mockResolvedValue(mockClient);
    mockNormalizeSafeRedirectPath.mockImplementation(
      (value: string | null | undefined, fallback = "/dashboard") => value ?? fallback,
    );
  });

  describe("signIn", () => {
    it("successful sign-in triggers redirect to role home", async () => {
      const { signIn } = await loadActions();

      mockSignInWithPasswordService.mockResolvedValue({ success: true, data: { role: "member" } });

      await expect(signIn("member@enterprise.dev", "password123")).rejects.toSatisfy(
        (error: unknown) => {
          expectRedirectDigest(error, "/dashboard");
          return true;
        },
      );
    });

    it('failed sign-in returns { error: "Invalid credentials" }', async () => {
      const { signIn } = await loadActions();

      mockSignInWithPasswordService.mockResolvedValue({
        success: false,
        error: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      });

      const result = await signIn("member@enterprise.dev", "wrong-password");
      expect(result).toEqual({ error: "Invalid credentials" });
    });

    it("provided redirectTo is normalized via normalizeSafeRedirectPath before redirect", async () => {
      const { signIn } = await loadActions();

      mockSignInWithPasswordService.mockResolvedValue({ success: true, data: { role: "member" } });
      mockNormalizeSafeRedirectPath.mockReturnValueOnce("/dashboard/settings");

      await expect(
        signIn("member@enterprise.dev", "password123", "/dashboard/settings"),
      ).rejects.toSatisfy((error: unknown) => {
        expect(mockNormalizeSafeRedirectPath).toHaveBeenCalledWith(
          "/dashboard/settings",
          "/dashboard",
        );
        expectRedirectDigest(error, "/dashboard/settings");
        return true;
      });
    });
  });

  describe("signInAction", () => {
    it("invalid FormData redirects to /sign-in", async () => {
      const { signInAction } = await loadActions();
      const formData = buildFormData({ email: "invalid" });

      await expect(signInAction(formData)).rejects.toSatisfy((error: unknown) => {
        expectRedirectDigest(error, "/sign-in");
        return true;
      });
    });

    it("valid credentials call signIn", async () => {
      const { signInAction } = await loadActions();

      mockSignInWithPasswordService.mockResolvedValue({ success: true, data: { role: "member" } });

      const formData = buildFormData({
        email: "member@enterprise.dev",
        password: "password123",
      });

      await expect(signInAction(formData)).rejects.toSatisfy((error: unknown) => {
        expect(mockSignInWithPasswordService).toHaveBeenCalledWith(mockClient, {
          email: "member@enterprise.dev",
          password: "password123",
        });
        expectRedirectDigest(error, "/dashboard");
        return true;
      });
    });

    it("when signIn returns error, redirects to /sign-in with preserved normalized redirectTo when present", async () => {
      const { signInAction } = await loadActions();

      mockSignInWithPasswordService.mockResolvedValue({
        success: false,
        error: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      });
      mockNormalizeSafeRedirectPath.mockReturnValueOnce("/dashboard/settings");

      const formData = buildFormData({
        email: "member@enterprise.dev",
        password: "wrong-password",
        redirectTo: "/dashboard/settings",
      });

      await expect(signInAction(formData)).rejects.toSatisfy((error: unknown) => {
        expectRedirectDigest(error, "/sign-in?redirectTo=%2Fdashboard%2Fsettings");
        return true;
      });
    });
  });

  describe("signUpAction", () => {
    it("invalid payload redirects to /sign-up?error=validation", async () => {
      const { signUpAction } = await loadActions();
      const formData = buildFormData({ email: "invalid", password: "short" });

      await expect(signUpAction(formData)).rejects.toSatisfy((error: unknown) => {
        expectRedirectDigest(error, "/sign-up?error=validation");
        return true;
      });
    });

    it("service failure redirects to /sign-up?error=failed", async () => {
      const { signUpAction } = await loadActions();

      mockSignUpService.mockResolvedValue({
        success: false,
        error: "failed",
        code: "SIGN_UP_FAILED",
      });

      const formData = buildFormData({
        name: "Member User",
        email: "member@enterprise.dev",
        password: "password123",
      });

      await expect(signUpAction(formData)).rejects.toSatisfy((error: unknown) => {
        expectRedirectDigest(error, "/sign-up?error=failed");
        return true;
      });
    });

    it("success redirects to /sign-in?registered=1", async () => {
      const { signUpAction } = await loadActions();

      mockSignUpService.mockResolvedValue({
        success: true,
        data: { userId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", needsEmailConfirmation: false },
      });

      const formData = buildFormData({
        name: "Member User",
        email: "member@enterprise.dev",
        password: "password123",
      });

      await expect(signUpAction(formData)).rejects.toSatisfy((error: unknown) => {
        expect(mockSignOutService).toHaveBeenCalledWith(mockClient);
        expectRedirectDigest(error, "/sign-in?registered=1");
        return true;
      });
    });
  });

  describe("forgotPasswordAction", () => {
    it("invalid payload redirects to /forgot-password?error=validation", async () => {
      const { forgotPasswordAction } = await loadActions();
      const formData = buildFormData({ email: "invalid" });

      await expect(forgotPasswordAction(formData)).rejects.toSatisfy((error: unknown) => {
        expectRedirectDigest(error, "/forgot-password?error=validation");
        return true;
      });
    });

    it("service failure redirects to /forgot-password?error=failed", async () => {
      const { forgotPasswordAction } = await loadActions();
      mockRequestPasswordResetService.mockResolvedValue({
        success: false,
        error: "failed",
        code: "PASSWORD_RESET_REQUEST_FAILED",
      });

      const formData = buildFormData({ email: "member@enterprise.dev" });

      await expect(forgotPasswordAction(formData)).rejects.toSatisfy((error: unknown) => {
        expectRedirectDigest(error, "/forgot-password?error=failed");
        return true;
      });
    });

    it("success redirects to /forgot-password?sent=1", async () => {
      const { forgotPasswordAction } = await loadActions();
      mockRequestPasswordResetService.mockResolvedValue({ success: true, data: null });

      const formData = buildFormData({ email: "member@enterprise.dev" });

      await expect(forgotPasswordAction(formData)).rejects.toSatisfy((error: unknown) => {
        expectRedirectDigest(error, "/forgot-password?sent=1");
        return true;
      });
    });
  });

  describe("signOut", () => {
    it("always redirects to /sign-in after calling signOut service", async () => {
      const { signOut } = await loadActions();

      mockSignOutService.mockResolvedValue({
        success: false,
        error: "failed",
        code: "SIGN_OUT_FAILED",
      });

      await expect(signOut()).rejects.toSatisfy((error: unknown) => {
        expect(mockSignOutService).toHaveBeenCalledWith(mockClient);
        expectRedirectDigest(error, "/sign-in");
        return true;
      });
    });
  });

  describe("updatePasswordAction", () => {
    it("invalid payload redirects to /reset-password?error=validation", async () => {
      const { updatePasswordAction } = await loadActions();
      const formData = buildFormData({ password: "password123" });

      await expect(updatePasswordAction(formData)).rejects.toSatisfy((error: unknown) => {
        expectRedirectDigest(error, "/reset-password?error=validation");
        return true;
      });
    });

    it("service failure redirects to /reset-password?error=failed", async () => {
      const { updatePasswordAction } = await loadActions();
      mockUpdatePasswordService.mockResolvedValue({
        success: false,
        error: "failed",
        code: "PASSWORD_UPDATE_FAILED",
      });

      const formData = buildFormData({
        password: "password123",
        confirmPassword: "password123",
      });

      await expect(updatePasswordAction(formData)).rejects.toSatisfy((error: unknown) => {
        expectRedirectDigest(error, "/reset-password?error=failed");
        return true;
      });
    });

    it("success signs out and redirects to /sign-in?passwordUpdated=1", async () => {
      const { updatePasswordAction } = await loadActions();
      mockUpdatePasswordService.mockResolvedValue({ success: true, data: null });
      mockSignOutService.mockResolvedValue({ success: true, data: null });

      const formData = buildFormData({
        password: "password123",
        confirmPassword: "password123",
      });

      await expect(updatePasswordAction(formData)).rejects.toSatisfy((error: unknown) => {
        expect(mockSignOutService).toHaveBeenCalledWith(mockClient);
        expectRedirectDigest(error, "/sign-in?passwordUpdated=1");
        return true;
      });
    });
  });
});
