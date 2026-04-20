import { describe, expect, it } from "vitest";
import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZES,
  STORAGE_BUCKETS,
  STORAGE_PATHS,
} from "./storage-paths";

describe("storage paths", () => {
  it("builds avatar and document paths with tenant isolation", () => {
    expect(STORAGE_PATHS.avatar("tenant-1", "user-9", "png")).toBe("tenant-1/user-9/avatar.png");
    expect(STORAGE_PATHS.document("tenant-1", "invoice", "doc-2", "invoice.pdf")).toBe(
      "tenant-1/invoice/doc-2/invoice.pdf",
    );
  });

  it("exposes public avatar prefix under avatars bucket", () => {
    expect(STORAGE_PATHS.publicAvatar("tenant-1", "user-9")).toBe("avatars/tenant-1/user-9");
  });

  it("keeps extension and size constraints per bucket", () => {
    expect(ALLOWED_EXTENSIONS[STORAGE_BUCKETS.DOCUMENTS]).toContain("pdf");
    expect(ALLOWED_EXTENSIONS[STORAGE_BUCKETS.AVATARS]).not.toContain("pdf");
    expect(MAX_FILE_SIZES[STORAGE_BUCKETS.DOCUMENTS]).toBeGreaterThan(
      MAX_FILE_SIZES[STORAGE_BUCKETS.AVATARS],
    );
  });
});
