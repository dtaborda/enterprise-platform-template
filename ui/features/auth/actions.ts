"use server";

import {
  type ActionResult,
  loginDto,
  registrationMetadataSchema,
  resetPasswordDto,
  signUpDto,
  type UserRole,
  updatePasswordDto,
} from "@enterprise/contracts";
import { createPaymentAdapter } from "@enterprise/core/services/adapters/payment-adapter-factory";
import {
  requestPasswordResetService,
  resolveRoleRedirectPath,
  signInWithPasswordService,
  signOutService,
  signUpService,
  updatePasswordService,
} from "@enterprise/core/services/auth-service";
import { createBackendAdapters } from "@enterprise/core/services/backend-adapters";
import { initializeSubscription } from "@enterprise/core/services/billing-service";
import { getAdminClient } from "@enterprise/core/supabase/admin";
import { getServerClient } from "@enterprise/core/supabase/server";
import { getAppUrl } from "@enterprise/core/utils/env";
import { redirect } from "next/navigation";
import { normalizeSafeRedirectPath } from "./redirects";

// Auth factory is request-scoped: call authFactory(client) per request.
const { auth: authFactory } = createBackendAdapters();

function resolveRoleRedirect(role: UserRole | null | undefined) {
  return resolveRoleRedirectPath(role);
}

const AUTH_CALLBACK_PATH = "/auth/callback";

export async function signIn(email: string, password: string, redirectTo?: string | null) {
  const supabase = await getServerClient();
  const auth = authFactory(supabase);

  const result = await signInWithPasswordService(auth, { email, password });

  if (!result.success) {
    return { error: "Invalid credentials" };
  }

  redirect(normalizeSafeRedirectPath(redirectTo, resolveRoleRedirect(result.data.role)));
}

export async function signInAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsedInput = loginDto.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const parsedRedirect = formData.get("redirectTo");
  const redirectTo =
    typeof parsedRedirect === "string" && parsedRedirect.length > 0
      ? normalizeSafeRedirectPath(parsedRedirect)
      : null;

  if (!parsedInput.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Please fix the errors below.",
        details: parsedInput.error.flatten().fieldErrors as Record<string, unknown>,
      },
    };
  }

  const { email, password } = parsedInput.data;
  const result = await signIn(email, password, redirectTo);

  if (result?.error) {
    return {
      success: false,
      error: {
        code: "AUTH_ERROR",
        message: "Invalid email or password.",
      },
    };
  }

  // signIn redirects on success — this is unreachable but satisfies TS
  return { success: true };
}

export async function signUpAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsedInput = signUpDto.safeParse({
    name: formData.get("name") || undefined,
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsedInput.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Please fix the errors below.",
        details: parsedInput.error.flatten().fieldErrors as Record<string, unknown>,
      },
    };
  }

  const metadata = registrationMetadataSchema.parse({
    name: parsedInput.data.name,
  });

  const supabase = await getServerClient();
  const auth = authFactory(supabase);
  const appUrl = getAppUrl();
  const result = await signUpService(auth, {
    ...parsedInput.data,
    metadata,
    emailRedirectTo: `${appUrl}${AUTH_CALLBACK_PATH}`,
  });

  if (!result.success) {
    return {
      success: false,
      error: {
        code: "AUTH_ERROR",
        message: result.error ?? "We could not create your account. Please try again.",
      },
    };
  }

  // Initialize Free plan subscription for the new tenant.
  // The DB trigger handle_new_user() already created the tenant by this point.
  // This MUST NOT block signup — failures are logged but ignored.
  try {
    const adminClient = getAdminClient();
    const { data: profile } = await adminClient
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", result.data.userId)
      .maybeSingle<{ tenant_id: string }>();

    if (profile?.tenant_id) {
      await initializeSubscription(adminClient, profile.tenant_id, createPaymentAdapter());
    }
  } catch {
    // Billing init failure must never block signup
    console.error("[auth] billing init failed for user:", result.data.userId);
  }

  await signOutService(auth);

  redirect("/sign-in?registered=1");
}

export async function forgotPasswordAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsedInput = resetPasswordDto.safeParse({
    email: formData.get("email"),
  });

  if (!parsedInput.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Please fix the errors below.",
        details: parsedInput.error.flatten().fieldErrors as Record<string, unknown>,
      },
    };
  }

  const supabase = await getServerClient();
  const auth = authFactory(supabase);
  const appUrl = getAppUrl();

  const result = await requestPasswordResetService(auth, {
    email: parsedInput.data.email,
    redirectTo: `${appUrl}${AUTH_CALLBACK_PATH}?next=/reset-password`,
  });

  if (!result.success) {
    return {
      success: false,
      error: {
        code: "AUTH_ERROR",
        message: "We could not process your request. Please try again.",
      },
    };
  }

  redirect("/forgot-password?sent=1");
}

export async function signOut() {
  const supabase = await getServerClient();
  const auth = authFactory(supabase);

  await signOutService(auth);
  redirect("/sign-in");
}

export async function updatePasswordAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsedInput = updatePasswordDto.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsedInput.success) {
    const fieldErrors = parsedInput.error.flatten().fieldErrors;
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Please fix the errors below.",
        details: fieldErrors as Record<string, unknown>,
      },
    };
  }

  const supabase = await getServerClient();
  const auth = authFactory(supabase);
  const result = await updatePasswordService(auth, {
    password: parsedInput.data.password,
  });

  if (!result.success) {
    return {
      success: false,
      error: {
        code: "AUTH_ERROR",
        message: "We could not update your password. Please request a new link and try again.",
      },
    };
  }

  await signOutService(auth);
  redirect("/sign-in?passwordUpdated=1");
}
