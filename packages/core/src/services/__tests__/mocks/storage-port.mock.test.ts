import { describe, expect, it, vi } from "vitest";
import { createMockStoragePort } from "./storage-port.mock";

describe("createMockStoragePort", () => {
  it("returns an object with all StoragePort methods as vi.fn() stubs", () => {
    const storage = createMockStoragePort();

    expect(typeof storage.upload).toBe("function");
    expect(typeof storage.download).toBe("function");
    expect(typeof storage.delete).toBe("function");
    expect(typeof storage.getSignedUrl).toBe("function");
    expect(typeof storage.getPublicUrl).toBe("function");
    expect(typeof storage.listFiles).toBe("function");
  });

  it("stubs are independently mockable via vi.mocked()", async () => {
    const storage = createMockStoragePort();

    vi.mocked(storage.upload).mockResolvedValue({
      success: true,
      data: { path: "avatars/file.webp", fullPath: "avatars/tenant-1/file.webp" },
    });

    const result = await storage.upload("avatars", "tenant-1/file.webp", new Blob(["data"]));
    expect(result).toEqual({
      success: true,
      data: { path: "avatars/file.webp", fullPath: "avatars/tenant-1/file.webp" },
    });
  });

  it("returns a fresh instance each call (no shared state)", () => {
    const storage1 = createMockStoragePort();
    const storage2 = createMockStoragePort();

    expect(storage1.upload).not.toBe(storage2.upload);
  });

  it("stubs start with zero call count", () => {
    const storage = createMockStoragePort();

    expect(vi.mocked(storage.upload).mock.calls).toHaveLength(0);
    expect(vi.mocked(storage.download).mock.calls).toHaveLength(0);
    expect(vi.mocked(storage.delete).mock.calls).toHaveLength(0);
    expect(vi.mocked(storage.getSignedUrl).mock.calls).toHaveLength(0);
    expect(vi.mocked(storage.getPublicUrl).mock.calls).toHaveLength(0);
    expect(vi.mocked(storage.listFiles).mock.calls).toHaveLength(0);
  });
});
