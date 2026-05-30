import type { PlatformUser, RegistrationMetadata, UserRole } from "@enterprise/contracts";
import type { AuthPort } from "./ports/auth-port";

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

// Sync with: ui/lib/routes.ts → ROUTES.dashboard
const DASHBOARD_HOME = "/dashboard";

const ROLE_HOME_PATHS: Record<UserRole, string> = {
  owner: DASHBOARD_HOME,
  admin: DASHBOARD_HOME,
  member: DASHBOARD_HOME,
  guest: DASHBOARD_HOME,
};

export function resolveRoleRedirectPath(role: UserRole | null | undefined): string {
  if (!role) {
    return DASHBOARD_HOME;
  }

  return ROLE_HOME_PATHS[role] ?? DASHBOARD_HOME;
}

/**
 * Returns the platform role for a given userId.
 *
 * Delegates to auth.getUserRole() — the adapter handles the DB lookup.
 * The SupabaseAuthAdapter queries the profiles table directly.
 *
 * Note: This function still accepts AuthPort (not SupabaseClient) because
 * getUserRole is part of the auth provider contract — adapters that embed
 * the role in JWT claims can resolve it without a DB call.
 *
 * Middleware keeps a SupabaseClient for the DB query until DatabasePort lands.
 * In that context, pass `authFactory(supabase)` to get the AuthPort.
 */
export async function getUserRoleService(
  auth: AuthPort,
  userId: string,
): Promise<ServiceResult<UserRoleServiceData>> {
  return auth.getUserRole(userId);
}

/**
 * Returns the currently authenticated platform user.
 *
 * Delegates to auth.getUser() — the adapter validates the token server-side
 * and resolves the profile data.
 */
export async function getCurrentPlatformUserService(
  auth: AuthPort,
): Promise<ServiceResult<PlatformUser | null>> {
  return auth.getUser();
}

/**
 * Authenticates a user with email and password.
 *
 * Delegates to auth.signInWithPassword() — the adapter handles the
 * Supabase SDK call, role lookup, and error code mapping.
 */
export async function signInWithPasswordService(
  auth: AuthPort,
  input: SignInServiceInput,
): Promise<ServiceResult<SignInServiceData>> {
  return auth.signInWithPassword(input);
}

/**
 * Terminates the current user session.
 *
 * Delegates to auth.signOut() — the adapter handles the provider call.
 */
export async function signOutService(auth: AuthPort): Promise<ServiceResult<null>> {
  return auth.signOut();
}

/**
 * Registers a new user account.
 *
 * Delegates to auth.signUp() — the adapter handles the provider call,
 * email confirmation detection, and error code mapping.
 */
export async function signUpService(
  auth: AuthPort,
  input: SignUpServiceInput,
): Promise<ServiceResult<SignUpServiceData>> {
  return auth.signUp(input);
}

/**
 * Sends a password reset email to the specified address.
 *
 * Delegates to auth.requestPasswordReset() — the adapter handles the
 * provider call and error code mapping.
 */
export async function requestPasswordResetService(
  auth: AuthPort,
  input: PasswordResetServiceInput,
): Promise<ServiceResult<null>> {
  return auth.requestPasswordReset(input);
}

/**
 * Updates the password for the currently authenticated user.
 *
 * Delegates to auth.updatePassword() — the adapter handles the provider call.
 */
export async function updatePasswordService(
  auth: AuthPort,
  input: UpdatePasswordServiceInput,
): Promise<ServiceResult<null>> {
  return auth.updatePassword(input);
}
