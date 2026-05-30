import type { PlatformUser, UserRole } from "@enterprise/contracts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PasswordResetServiceInput,
  ServiceResult,
  SignInServiceData,
  SignInServiceInput,
  SignUpServiceData,
  SignUpServiceInput,
  UpdatePasswordServiceInput,
  UserRoleServiceData,
} from "../auth-service";
import type { AuthPort } from "../ports/auth-port";

/**
 * SupabaseAuthAdapter — implements AuthPort using the Supabase JS client.
 *
 * This is the reference implementation and the canonical example for building
 * custom AuthPort adapters. Each method maps 1:1 to a function in the
 * pre-refactor auth-service.ts.
 *
 * Construction requires a SupabaseClient scoped to the current request
 * (server or middleware client). It is the caller's responsibility to provide
 * the correctly-scoped client — server client for Server Actions, middleware
 * client for middleware flows.
 */
export class SupabaseAuthAdapter implements AuthPort {
  constructor(private readonly client: SupabaseClient) {}

  async signInWithPassword(input: SignInServiceInput): Promise<ServiceResult<SignInServiceData>> {
    const { error } = await this.client.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) {
      return { success: false, error: "Invalid credentials", code: "INVALID_CREDENTIALS" };
    }

    const {
      data: { user },
    } = await this.client.auth.getUser();

    if (!user) {
      return { success: false, error: "User not found after sign-in", code: "USER_NOT_FOUND" };
    }

    const roleResult = await this.getUserRole(user.id);

    if (!roleResult.success) {
      return roleResult;
    }

    return { success: true, data: { role: roleResult.data.role } };
  }

  async signUp(input: SignUpServiceInput): Promise<ServiceResult<SignUpServiceData>> {
    const { data, error } = await this.client.auth.signUp({
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

  async signOut(): Promise<ServiceResult<null>> {
    const { error } = await this.client.auth.signOut();

    if (error) {
      return { success: false, error: "Could not sign out", code: "SIGN_OUT_FAILED" };
    }

    return { success: true, data: null };
  }

  async getUser(): Promise<ServiceResult<PlatformUser | null>> {
    const {
      data: { user },
      error,
    } = await this.client.auth.getUser();

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

    const { data: profile } = await this.client
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

  async getUserRole(userId: string): Promise<ServiceResult<UserRoleServiceData>> {
    const { data: profile, error } = await this.client
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

  async requestPasswordReset(input: PasswordResetServiceInput): Promise<ServiceResult<null>> {
    const { error } = await this.client.auth.resetPasswordForEmail(input.email, {
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

  async updatePassword(input: UpdatePasswordServiceInput): Promise<ServiceResult<null>> {
    const { error } = await this.client.auth.updateUser({
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
}
