/**
 * Port mock helpers — shared test utilities for service unit tests.
 *
 * Import from this barrel when writing tests for services that depend on
 * AuthPort, StoragePort, or SessionPort:
 *
 * ```typescript
 * import { createMockAuthPort, createMockStoragePort } from "./__tests__/mocks";
 * ```
 *
 * Each factory returns a fresh object per call (no shared state between tests)
 * with all interface methods wired as `vi.fn()` stubs ready for
 * `vi.mocked(port.method).mockResolvedValue(...)`.
 */
export { createMockAuthPort } from "./auth-port.mock";
export { createMockSessionPort } from "./session-port.mock";
export { createMockStoragePort } from "./storage-port.mock";
