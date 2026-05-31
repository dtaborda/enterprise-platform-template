import { vi } from "vitest";
import type { SessionPort } from "../../ports/session-port";

/**
 * createMockSessionPort — returns a fully-typed SessionPort where every method
 * is a `vi.fn()` stub with no default implementation.
 *
 * Usage in test files:
 *
 * ```typescript
 * import { createMockSessionPort } from "./__tests__/mocks/session-port.mock";
 *
 * const session = createMockSessionPort();
 * vi.mocked(session.refreshSession).mockResolvedValue(NextResponse.next());
 * ```
 *
 * All methods conform to the SessionPort interface, so TypeScript will catch
 * any drift between the mock and the live interface at compile time.
 */
export function createMockSessionPort(): SessionPort {
  return {
    refreshSession: vi.fn<SessionPort["refreshSession"]>(),
  };
}
