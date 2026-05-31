import { vi } from "vitest";
import type { AuthPort } from "../../ports/auth-port";

/**
 * createMockAuthPort — returns a fully-typed AuthPort where every method is a
 * `vi.fn()` stub with no default implementation.
 *
 * Usage in test files:
 *
 * ```typescript
 * import { createMockAuthPort } from "./__tests__/mocks/auth-port.mock";
 *
 * const auth = createMockAuthPort();
 * vi.mocked(auth.signInWithPassword).mockResolvedValue({ success: true, data: { role: "member" } });
 * ```
 *
 * All methods conform to the AuthPort interface, so TypeScript will catch any
 * drift between the mock and the live interface at compile time.
 */
export function createMockAuthPort(): AuthPort {
  return {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    getUser: vi.fn(),
    getUserRole: vi.fn(),
    requestPasswordReset: vi.fn(),
    updatePassword: vi.fn(),
  };
}
