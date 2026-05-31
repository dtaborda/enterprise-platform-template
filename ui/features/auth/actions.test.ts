import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROUTES } from "../../lib/routes";
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
  mockAuthFactory,
} = vi.hoisted(() => {
  const mockAuthFactory = vi.fn((client: unknown) => client);
  return {
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
    mockAuthFactory,
  };
});

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

vi.mock("@enterprise/core/services/backend-adapters", () => ({
  createBackendAdapters: () => ({
    auth: mockAuthFactory,
    session: { refreshSession: vi.fn() },
    storage: vi.fn(),
  }),
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
      mockNormalizeSafeRedirectPath.mockReturnValueOnce(ROUTES.settings);

      await expect(
        signIn("member@enterprise.dev", "password123", ROUTES.settings),
      ).rejects.toSatisfy((error: unknown) => {
        expect(mockNormalizeSafeRedirectPath).toHaveBeenCalledWith(
          ROUTES.settings,
          ROUTES.dashboard,
        );
        expectRedirectDigest(error, ROUTES.settings);
        return true;
      });
    });
  });

  describe("signInAction", () => {
    it("invalid FormData returns ActionResult with field errors", async () => {
      const { signInAction } = await loadActions();
      const formData = buildFormData({ email: "invalid" });

      const result = await signInAction(null, formData);

      expect(result).toMatchObject({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Please fix the errors below.",
        },
      });
      expect(result.error?.details).toBeDefined();
    });

    it("valid credentials call signIn and redirect on success", async () => {
      const { signInAction } = await loadActions();

      mockSignInWithPasswordService.mockResolvedValue({ success: true, data: { role: "member" } });

      const formData = buildFormData({
        email: "member@enterprise.dev",
        password: "password123",
      });

      await expect(signInAction(null, formData)).rejects.toSatisfy((error: unknown) => {
        expect(mockSignInWithPasswordService).toHaveBeenCalledWith(mockClient, {
          email: "member@enterprise.dev",
          password: "password123",
        });
        expectRedirectDigest(error, "/dashboard");
        return true;
      });
    });

    it("when signIn returns error, returns ActionResult with AUTH_ERROR", async () => {
      const { signInAction } = await loadActions();

      mockSignInWithPasswordService.mockResolvedValue({
        success: false,
        error: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      });

      const formData = buildFormData({
        email: "member@enterprise.dev",
        password: "wrong-password",
      });

      const result = await signInAction(null, formData);

      expect(result).toEqual({
        success: false,
        error: {
          code: "AUTH_ERROR",
          message: "Invalid email or password.",
        },
      });
    });

    it("when signIn returns error with redirectTo, returns ActionResult with AUTH_ERROR", async () => {
      const { signInAction } = await loadActions();

      mockSignInWithPasswordService.mockResolvedValue({
        success: false,
        error: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      });
      mockNormalizeSafeRedirectPath.mockReturnValueOnce(ROUTES.settings);

      const formData = buildFormData({
        email: "member@enterprise.dev",
        password: "wrong-password",
        redirectTo: ROUTES.settings,
      });

      const result = await signInAction(null, formData);

      expect(result).toEqual({
        success: false,
        error: {
          code: "AUTH_ERROR",
          message: "Invalid email or password.",
        },
      });
    });
  });

  describe("signUpAction", () => {
    it("invalid payload returns ActionResult with field errors", async () => {
      const { signUpAction } = await loadActions();
      const formData = buildFormData({ email: "invalid", password: "short" });

      const result = await signUpAction(null, formData);

      expect(result).toMatchObject({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Please fix the errors below.",
        },
      });
      expect(result.error?.details).toBeDefined();
    });

    it("service failure returns ActionResult with AUTH_ERROR", async () => {
      const { signUpAction } = await loadActions();

      mockSignUpService.mockResolvedValue({
        success: false,
        error: "Email already in use.",
        code: "SIGN_UP_FAILED",
      });

      const formData = buildFormData({
        name: "Member User",
        email: "member@enterprise.dev",
        password: "password123",
      });

      const result = await signUpAction(null, formData);

      expect(result).toMatchObject({
        success: false,
        error: {
          code: "AUTH_ERROR",
        },
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

      await expect(signUpAction(null, formData)).rejects.toSatisfy((error: unknown) => {
        expect(mockSignOutService).toHaveBeenCalledWith(mockClient);
        expectRedirectDigest(error, "/sign-in?registered=1");
        return true;
      });
    });
  });

  describe("forgotPasswordAction", () => {
    it("invalid payload returns ActionResult with field errors", async () => {
      const { forgotPasswordAction } = await loadActions();
      const formData = buildFormData({ email: "invalid" });

      const result = await forgotPasswordAction(null, formData);

      expect(result).toMatchObject({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Please fix the errors below.",
        },
      });
      expect(result.error?.details).toBeDefined();
    });

    it("service failure returns ActionResult with AUTH_ERROR", async () => {
      const { forgotPasswordAction } = await loadActions();
      mockRequestPasswordResetService.mockResolvedValue({
        success: false,
        error: "failed",
        code: "PASSWORD_RESET_REQUEST_FAILED",
      });

      const formData = buildFormData({ email: "member@enterprise.dev" });

      const result = await forgotPasswordAction(null, formData);

      expect(result).toMatchObject({
        success: false,
        error: {
          code: "AUTH_ERROR",
        },
      });
    });

    it("success redirects to /forgot-password?sent=1", async () => {
      const { forgotPasswordAction } = await loadActions();
      mockRequestPasswordResetService.mockResolvedValue({ success: true, data: null });

      const formData = buildFormData({ email: "member@enterprise.dev" });

      await expect(forgotPasswordAction(null, formData)).rejects.toSatisfy((error: unknown) => {
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
    it("missing confirmPassword returns ActionResult with field errors", async () => {
      const { updatePasswordAction } = await loadActions();
      const formData = buildFormData({ password: "password123" });

      const result = await updatePasswordAction(null, formData);

      expect(result).toMatchObject({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Please fix the errors below.",
        },
      });
      expect(result.error?.details).toBeDefined();
    });

    it("mismatched passwords returns ActionResult with confirmPassword field error", async () => {
      const { updatePasswordAction } = await loadActions();
      const formData = buildFormData({
        password: "password123",
        confirmPassword: "different456",
      });

      const result = await updatePasswordAction(null, formData);

      expect(result).toMatchObject({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Please fix the errors below.",
        },
      });
      const details = result.error?.details as Record<string, string[]> | undefined;
      expect(details?.["confirmPassword"]).toBeDefined();
    });

    it("service failure returns ActionResult with AUTH_ERROR", async () => {
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

      const result = await updatePasswordAction(null, formData);

      expect(result).toMatchObject({
        success: false,
        error: {
          code: "AUTH_ERROR",
        },
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

      await expect(updatePasswordAction(null, formData)).rejects.toSatisfy((error: unknown) => {
        expect(mockSignOutService).toHaveBeenCalledWith(mockClient);
        expectRedirectDigest(error, "/sign-in?passwordUpdated=1");
        return true;
      });
    });
  });
});
