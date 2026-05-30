/**
 * supabase-storage-adapter.test.ts — TDD: validates SupabaseStorageAdapter maps
 * Supabase Storage API responses to ServiceResult<T>.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { SupabaseStorageAdapter } from "../supabase-storage-adapter";

// Minimal Supabase Storage mock
function createMockStorageClient() {
  const storageMethods = {
    upload: vi.fn(),
    download: vi.fn(),
    remove: vi.fn(),
    createSignedUrl: vi.fn(),
    getPublicUrl: vi.fn(),
    list: vi.fn(),
  };

  return {
    storage: {
      from: vi.fn(() => storageMethods),
    },
    __storageMethods: storageMethods,
  } as unknown as SupabaseClient & {
    __storageMethods: typeof storageMethods;
  };
}

describe("SupabaseStorageAdapter", () => {
  describe("upload", () => {
    it("returns path and fullPath on success", async () => {
      const client = createMockStorageClient();
      const adapter = new SupabaseStorageAdapter(client);

      client.__storageMethods.upload.mockResolvedValue({
        data: { path: "tenant-1/avatar.webp", fullPath: "avatars/tenant-1/avatar.webp" },
        error: null,
      });

      const result = await adapter.upload(
        "avatars",
        "tenant-1/avatar.webp",
        new Blob(["image data"]),
        { contentType: "image/webp" },
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.path).toBe("tenant-1/avatar.webp");
        expect(result.data.fullPath).toBe("avatars/tenant-1/avatar.webp");
      }
    });

    it("returns STORAGE_UPLOAD_FAILED on error", async () => {
      const client = createMockStorageClient();
      const adapter = new SupabaseStorageAdapter(client);

      client.__storageMethods.upload.mockResolvedValue({
        data: null,
        error: { message: "Bucket not found" },
      });

      const result = await adapter.upload("missing-bucket", "file.png", new Blob(["data"]));

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("STORAGE_UPLOAD_FAILED");
        expect(result.error).toContain("Bucket not found");
      }
    });
  });

  describe("download", () => {
    it("returns Blob on success", async () => {
      const client = createMockStorageClient();
      const adapter = new SupabaseStorageAdapter(client);
      const blobData = new Blob(["file content"]);

      client.__storageMethods.download.mockResolvedValue({
        data: blobData,
        error: null,
      });

      const result = await adapter.download("avatars", "tenant-1/avatar.webp");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(blobData);
      }
    });

    it("returns STORAGE_DOWNLOAD_FAILED when error", async () => {
      const client = createMockStorageClient();
      const adapter = new SupabaseStorageAdapter(client);

      client.__storageMethods.download.mockResolvedValue({
        data: null,
        error: { message: "Object not found" },
      });

      const result = await adapter.download("avatars", "missing-file.png");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("STORAGE_DOWNLOAD_FAILED");
      }
    });
  });

  describe("delete", () => {
    it("accepts multiple paths and returns success", async () => {
      const client = createMockStorageClient();
      const adapter = new SupabaseStorageAdapter(client);

      client.__storageMethods.remove.mockResolvedValue({ data: [], error: null });

      const paths = ["folder/file1.png", "folder/file2.png", "folder/file3.png"];
      const result = await adapter.delete("avatars", paths);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
      // Verify the underlying client received the array
      expect(client.__storageMethods.remove).toHaveBeenCalledWith(paths);
    });

    it("returns STORAGE_DELETE_FAILED on error", async () => {
      const client = createMockStorageClient();
      const adapter = new SupabaseStorageAdapter(client);

      client.__storageMethods.remove.mockResolvedValue({
        data: null,
        error: { message: "Insufficient permissions" },
      });

      const result = await adapter.delete("avatars", ["file.png"]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("STORAGE_DELETE_FAILED");
      }
    });
  });

  describe("getSignedUrl", () => {
    it("returns signedUrl and expiresIn on success", async () => {
      const client = createMockStorageClient();
      const adapter = new SupabaseStorageAdapter(client);

      client.__storageMethods.createSignedUrl.mockResolvedValue({
        data: { signedUrl: "https://example.com/signed-url" },
        error: null,
      });

      const result = await adapter.getSignedUrl("avatars", "tenant-1/avatar.webp", 3600);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.signedUrl).toBe("https://example.com/signed-url");
        expect(result.data.expiresIn).toBe(3600);
      }
    });

    it("returns STORAGE_SIGNED_URL_FAILED on error", async () => {
      const client = createMockStorageClient();
      const adapter = new SupabaseStorageAdapter(client);

      client.__storageMethods.createSignedUrl.mockResolvedValue({
        data: null,
        error: { message: "Object not found" },
      });

      const result = await adapter.getSignedUrl("avatars", "missing.png", 3600);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("STORAGE_SIGNED_URL_FAILED");
      }
    });
  });

  describe("getPublicUrl", () => {
    it("always succeeds (Supabase never errors on URL construction)", async () => {
      const client = createMockStorageClient();
      const adapter = new SupabaseStorageAdapter(client);

      // Supabase getPublicUrl() is synchronous and never returns an error
      client.__storageMethods.getPublicUrl.mockReturnValue({
        data: { publicUrl: "https://example.supabase.co/storage/v1/object/public/avatars/file.png" },
      });

      const result = await adapter.getPublicUrl("avatars", "tenant-1/avatar.png");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.publicUrl).toContain("avatars");
      }
    });
  });

  describe("listFiles", () => {
    it("maps Supabase FileObject array to StorageFileEntry", async () => {
      const client = createMockStorageClient();
      const adapter = new SupabaseStorageAdapter(client);

      client.__storageMethods.list.mockResolvedValue({
        data: [
          {
            name: "avatar.webp",
            id: "file-id-1",
            updated_at: "2024-01-15T00:00:00Z",
            created_at: "2024-01-10T00:00:00Z",
            metadata: { size: 102400, mimetype: "image/webp" },
          },
          {
            name: "banner.png",
            id: "file-id-2",
            updated_at: "2024-02-01T00:00:00Z",
            created_at: "2024-01-20T00:00:00Z",
            metadata: { size: 204800, mimetype: "image/png" },
          },
        ],
        error: null,
      });

      const result = await adapter.listFiles("avatars", "tenant-1/");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        const first = result.data[0];
        const second = result.data[1];
        expect(first?.name).toBe("avatar.webp");
        expect(first?.size).toBe(102400);
        expect(first?.mimeType).toBe("image/webp");
        expect(second?.name).toBe("banner.png");
      }
    });

    it("returns empty array for empty bucket prefix", async () => {
      const client = createMockStorageClient();
      const adapter = new SupabaseStorageAdapter(client);

      client.__storageMethods.list.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await adapter.listFiles("avatars", "empty-prefix/");

      expect(result.success).toBe(true);
      if (result.success) {
        // Empty is valid — the bucket prefix exists but has no files
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data).toHaveLength(0);
      }
    });
  });
});
