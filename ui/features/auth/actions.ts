"use server";

import {
  loginDto,
  registrationMetadataSchema,
  resetPasswordDto,
  signUpDto,
  type UserRole,
  updatePasswordDto,
} from "@enterprise/contracts";
import {
  requestPasswordResetService,
  resolveRoleRedirectPath,
  signInWithPasswordService,
  signOutService,
  signUpService,
  updatePasswordService,
} from "@enterprise/core/services/auth-service";
import { getServerClient } from "@enterprise/core/supabase/server";
import { getAppUrl } from "@enterprise/core/utils/env";
import { redirect } from "next/navigation";
import { normalizeSafeRedirectPath } from "./redirects";

function resolveRoleRedirect(role: UserRole | null | undefined) {
  return resolveRoleRedirectPath(role);
}

const AUTH_CALLBACK_PATH = "/auth/callback";

export async function signIn(email: string, password: string, redirectTo?: string | null) {
  const supabase = await getServerClient();

  const result = await signInWithPasswordService(supabase, { email, password });

  if (!result.success) {
    return { error: "Invalid credentials" };
  }

  redirect(normalizeSafeRedirectPath(redirectTo, resolveRoleRedirect(result.data.role)));
}

export async function signInAction(formData: FormData) {
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
    redirect("/sign-in");
  }

  const { email, password } = parsedInput.data;
  const result = await signIn(email, password, redirectTo);

  if (result?.error) {
    const fallbackPath = redirectTo
      ? `/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`
      : "/sign-in";
    redirect(fallbackPath);
  }
}

export async function signUpAction(formData: FormData) {
  const parsedInput = signUpDto.safeParse({
    name: formData.get("name") || undefined,
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsedInput.success) {
    redirect("/sign-up?error=validation");
  }

  const metadata = registrationMetadataSchema.parse({
    name: parsedInput.data.name,
  });

  const supabase = await getServerClient();
  const appUrl = getAppUrl();
  const result = await signUpService(supabase, {
    ...parsedInput.data,
    metadata,
    emailRedirectTo: `${appUrl}${AUTH_CALLBACK_PATH}`,
  });

  if (!result.success) {
    redirect("/sign-up?error=failed");
  }

  await signOutService(supabase);

  redirect("/sign-in?registered=1");
}

export async function forgotPasswordAction(formData: FormData) {
  const parsedInput = resetPasswordDto.safeParse({
    email: formData.get("email"),
  });

  if (!parsedInput.success) {
    redirect("/forgot-password?error=validation");
  }

  const supabase = await getServerClient();
  const appUrl = getAppUrl();

  const result = await requestPasswordResetService(supabase, {
    email: parsedInput.data.email,
    redirectTo: `${appUrl}${AUTH_CALLBACK_PATH}?next=/reset-password`,
  });

  if (!result.success) {
    redirect("/forgot-password?error=failed");
  }

  redirect("/forgot-password?sent=1");
}

export async function signOut() {
  const supabase = await getServerClient();

  await signOutService(supabase);
  redirect("/sign-in");
}

export async function updatePasswordAction(formData: FormData) {
  const parsedInput = updatePasswordDto.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsedInput.success) {
    redirect("/reset-password?error=validation");
  }

  const supabase = await getServerClient();
  const result = await updatePasswordService(supabase, {
    password: parsedInput.data.password,
  });

  if (!result.success) {
    redirect("/reset-password?error=failed");
  }

  await signOutService(supabase);
  redirect("/sign-in?passwordUpdated=1");
}
