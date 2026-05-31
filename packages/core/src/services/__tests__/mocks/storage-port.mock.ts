import { vi } from "vitest";
import type { StoragePort } from "../../ports/storage-port";

/**
 * createMockStoragePort — returns a fully-typed StoragePort where every method
 * is a `vi.fn()` stub with no default implementation.
 *
 * Usage in test files:
 *
 * ```typescript
 * import { createMockStoragePort } from "./__tests__/mocks/storage-port.mock";
 *
 * const storage = createMockStoragePort();
 * vi.mocked(storage.upload).mockResolvedValue({
 *   success: true,
 *   data: { path: "avatars/file.webp", fullPath: "avatars/tenant-1/file.webp" },
 * });
 * ```
 *
 * All methods conform to the StoragePort interface, so TypeScript will catch
 * any drift between the mock and the live interface at compile time.
 */
export function createMockStoragePort(): StoragePort {
  return {
    upload: vi.fn(),
    download: vi.fn(),
    delete: vi.fn(),
    getSignedUrl: vi.fn(),
    getPublicUrl: vi.fn(),
    listFiles: vi.fn(),
  };
}
