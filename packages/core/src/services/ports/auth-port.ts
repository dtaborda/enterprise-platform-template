import type { PlatformUser } from "@enterprise/contracts";
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

/**
 * AuthPort — provider-agnostic authentication interface.
 *
 * Implement this interface to swap the auth backend without modifying any
 * service or Server Action. The Supabase reference implementation is
 * `SupabaseAuthAdapter`. Community adapters (Firebase, Clerk, Auth0) implement
 * the same interface.
 *
 * All methods return `ServiceResult<T>` — the same discriminated union used
 * throughout the service layer. Adapters MUST NOT throw; they must return
 * `{ success: false, error: string, code: string }` on failure.
 */
export interface AuthPort {
  /**
   * Authenticates a user with email and password.
   * Returns the user's role on success so the caller can resolve the redirect path.
   */
  signInWithPassword(input: SignInServiceInput): Promise<ServiceResult<SignInServiceData>>;

  /**
   * Registers a new user account.
   * Returns the new userId and whether email confirmation is required before login.
   */
  signUp(input: SignUpServiceInput): Promise<ServiceResult<SignUpServiceData>>;

  /**
   * Terminates the current user session.
   */
  signOut(): Promise<ServiceResult<null>>;

  /**
   * Returns the currently authenticated user, or null if no session is active.
   * Implementors MUST validate the token server-side (equivalent to Supabase's getUser(),
   * NOT getSession() which only decodes the JWT without server-side validation).
   */
  getUser(): Promise<ServiceResult<PlatformUser | null>>;

  /**
   * Returns the platform role for a given userId from the profiles table.
   * This method exists separately because role resolution requires a DB query
   * that may not be part of every auth provider's token claims.
   * Implementors that embed the role in the JWT may resolve it without a DB call.
   */
  getUserRole(userId: string): Promise<ServiceResult<UserRoleServiceData>>;

  /**
   * Sends a password reset email to the specified address.
   * The redirectTo URL is where the provider redirects after the user clicks the link.
   */
  requestPasswordReset(input: PasswordResetServiceInput): Promise<ServiceResult<null>>;

  /**
   * Updates the password for the currently authenticated user.
   * Requires an active session (the user clicked the reset link and is in a password-update flow).
   */
  updatePassword(input: UpdatePasswordServiceInput): Promise<ServiceResult<null>>;
}
