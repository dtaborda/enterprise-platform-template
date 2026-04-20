import type { RegistrationMetadata, UserRole } from "@enterprise/contracts";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ServiceSuccess<T> {
  success: true;
  data: T;
}

export interface ServiceFailure {
  success: false;
  error: string;
  code?: string;
}

export type ServiceResult<T> = ServiceSuccess<T> | ServiceFailure;

export interface SignInServiceInput {
  email: string;
  password: string;
}

export interface SignInServiceData {
  role: UserRole | null;
}

export interface SignUpServiceInput {
  email: string;
  password: string;
  metadata: RegistrationMetadata;
  emailRedirectTo: string;
}

export interface SignUpServiceData {
  userId: string;
  needsEmailConfirmation: boolean;
}

export interface PasswordResetServiceInput {
  email: string;
  redirectTo: string;
}

export interface UpdatePasswordServiceInput {
  password: string;
}

export async function signInWithPasswordService(
  client: SupabaseClient,
  input: SignInServiceInput,
): Promise<ServiceResult<SignInServiceData>> {
  const { error } = await client.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) {
    return { success: false, error: "Invalid credentials", code: "INVALID_CREDENTIALS" };
  }

  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return { success: false, error: "User not found after sign-in", code: "USER_NOT_FOUND" };
  }

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    return {
      success: false,
      error: "Could not load user profile",
      code: "PROFILE_NOT_FOUND",
    };
  }

  return {
    success: true,
    data: {
      role: (profile?.role as UserRole | null | undefined) ?? null,
    },
  };
}

export async function signOutService(client: SupabaseClient): Promise<ServiceResult<null>> {
  const { error } = await client.auth.signOut();

  if (error) {
    return { success: false, error: "Could not sign out", code: "SIGN_OUT_FAILED" };
  }

  return { success: true, data: null };
}

export async function signUpService(
  client: SupabaseClient,
  input: SignUpServiceInput,
): Promise<ServiceResult<SignUpServiceData>> {
  const { data, error } = await client.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: input.metadata,
      emailRedirectTo: input.emailRedirectTo,
    },
  });

  if (error) {
    return { success: false, error: "Could not create account", code: "SIGN_UP_FAILED" };
  }

  if (!data.user) {
    return { success: false, error: "User was not created", code: "USER_NOT_CREATED" };
  }

  return {
    success: true,
    data: {
      userId: data.user.id,
      needsEmailConfirmation: data.session === null,
    },
  };
}

export async function requestPasswordResetService(
  client: SupabaseClient,
  input: PasswordResetServiceInput,
): Promise<ServiceResult<null>> {
  const { error } = await client.auth.resetPasswordForEmail(input.email, {
    redirectTo: input.redirectTo,
  });

  if (error) {
    return {
      success: false,
      error: "Could not send password reset email",
      code: "PASSWORD_RESET_REQUEST_FAILED",
    };
  }

  return { success: true, data: null };
}

export async function updatePasswordService(
  client: SupabaseClient,
  input: UpdatePasswordServiceInput,
): Promise<ServiceResult<null>> {
  const { error } = await client.auth.updateUser({
    password: input.password,
  });

  if (error) {
    return {
      success: false,
      error: "Could not update password",
      code: "PASSWORD_UPDATE_FAILED",
    };
  }

  return { success: true, data: null };
}
