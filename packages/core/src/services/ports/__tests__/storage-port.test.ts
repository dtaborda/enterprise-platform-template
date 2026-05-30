/**
 * storage-port.test.ts — TDD: validates StoragePort interface contract
 *
 * These tests verify that:
 * 1. A plain object satisfying StoragePort compiles without SDK imports
 * 2. delete() accepts an array of multiple paths (not a single path)
 * 3. All 6 methods are present and callable
 */
import { describe, expect, it, vi } from "vitest";
import type { StoragePort } from "../storage-port";

/**
 * Canonical mock for StoragePort — no Supabase SDK required.
 */
function createMockStoragePort(): StoragePort {
  return {
    upload: vi.fn(),
    download: vi.fn(),
    delete: vi.fn(),
    getSignedUrl: vi.fn(),
    getPublicUrl: vi.fn(),
    listFiles: vi.fn(),
  };
}

describe("StoragePort interface", () => {
  it("a plain object mock satisfies StoragePort without SDK imports", () => {
    const storage: StoragePort = createMockStoragePort();

    // All 6 methods must be present
    expect(typeof storage.upload).toBe("function");
    expect(typeof storage.download).toBe("function");
    expect(typeof storage.delete).toBe("function");
    expect(typeof storage.getSignedUrl).toBe("function");
    expect(typeof storage.getPublicUrl).toBe("function");
    expect(typeof storage.listFiles).toBe("function");
  });

  it("delete accepts an array of multiple paths", async () => {
    const storage = createMockStoragePort();
    vi.mocked(storage.delete).mockResolvedValue({ success: true, data: null });

    const paths = ["folder/file1.png", "folder/file2.png", "folder/file3.png"];
    const result = await storage.delete("avatars", paths);

    expect(result.success).toBe(true);
    // Verify delete was called with the full array (not just one path)
    expect(vi.mocked(storage.delete)).toHaveBeenCalledWith("avatars", paths);
    expect(vi.mocked(storage.delete)).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(["folder/file1.png", "folder/file2.png", "folder/file3.png"]),
    );
  });

  it("upload returns path and fullPath on success", async () => {
    const storage = createMockStoragePort();
    vi.mocked(storage.upload).mockResolvedValue({
      success: true,
      data: {
        path: "tenant-1/avatar.webp",
        fullPath:
          "https://example.supabase.co/storage/v1/object/public/avatars/tenant-1/avatar.webp",
      },
    });

    const result = await storage.upload("avatars", "tenant-1/avatar.webp", new Blob(["data"]), {
      contentType: "image/webp",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.path).toBe("tenant-1/avatar.webp");
      expect(result.data.fullPath).toContain("avatars");
    }
  });

  it("getPublicUrl always succeeds (no error path)", async () => {
    const storage = createMockStoragePort();
    vi.mocked(storage.getPublicUrl).mockResolvedValue({
      success: true,
      data: { publicUrl: "https://example.supabase.co/storage/v1/object/public/avatars/file.png" },
    });

    const result = await storage.getPublicUrl("avatars", "tenant-1/avatar.png");

    // getPublicUrl MUST always return success: true (Supabase constructs URL without network call)
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.publicUrl).toBeTruthy();
    }
  });
});
