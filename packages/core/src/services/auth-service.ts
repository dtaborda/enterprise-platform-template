import type { PlatformUser, RegistrationMetadata, UserRole } from "@enterprise/contracts";
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

export interface UserRoleServiceData {
  role: UserRole;
}

const ROLE_HOME_PATHS: Record<UserRole, string> = {
  owner: "/dashboard",
  admin: "/dashboard",
  member: "/dashboard",
  guest: "/",
};

export function resolveRoleRedirectPath(role: UserRole | null | undefined): string {
  if (!role) {
    return "/dashboard";
  }

  return ROLE_HOME_PATHS[role] ?? "/dashboard";
}

export async function getUserRoleService(
  client: SupabaseClient,
  userId: string,
): Promise<ServiceResult<UserRoleServiceData>> {
  const { data: profile, error } = await client
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    return {
      success: false,
      error: "Could not load user role",
      code: "ROLE_LOOKUP_FAILED",
    };
  }

  return {
    success: true,
    data: {
      role: (profile?.role as UserRole | null | undefined) ?? "guest",
    },
  };
}

export async function getCurrentPlatformUserService(
  client: SupabaseClient,
): Promise<ServiceResult<PlatformUser | null>> {
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error) {
    return {
      success: false,
      error: "Could not resolve authenticated user",
      code: "AUTH_USER_LOOKUP_FAILED",
    };
  }

  if (!user) {
    return { success: true, data: null };
  }

  const { data: profile } = await client
    .from("profiles")
    .select("tenant_id, role, name, avatar_url")
    .eq("id", user.id)
    .single();

  return {
    success: true,
    data: {
      id: user.id,
      createdAt: new Date(user.created_at),
      updatedAt: new Date(user.updated_at ?? user.created_at),
      email: user.email ?? "",
      name: profile?.name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      role: (profile?.role as UserRole | undefined) ?? "guest",
      tenantId: profile?.tenant_id ?? "",
    },
  };
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

  const roleResult = await getUserRoleService(client, user.id);

  if (!roleResult.success) {
    return roleResult;
  }

  return {
    success: true,
    data: {
      role: roleResult.data.role,
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
