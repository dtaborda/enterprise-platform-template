/**
 * backend-adapters.test.ts — TDD: validates createBackendAdapters() factory
 *
 * Tests verify:
 * 1. Default (no env vars) returns Supabase adapter factories
 * 2. Unknown provider throws a descriptive error
 * 3. Missing NEXT_PUBLIC_SUPABASE_* does NOT throw at creation (lazy session resolution)
 */
import { afterEach, describe, expect, it } from "vitest";
import { createBackendAdapters } from "../backend-adapters";

// Store original env for restoration
const originalEnv = { ...process.env };

afterEach(() => {
  // Restore env after each test
  process.env = { ...originalEnv };
});

describe("createBackendAdapters", () => {
  describe("default configuration (Supabase provider)", () => {
    it("returns auth factory, storage factory, and session instance when supabase URL and key are set", () => {
      process.env["NEXT_PUBLIC_SUPABASE_URL"] = "https://test.supabase.co";
      process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] = "test-anon-key";
      delete process.env["BACKEND_AUTH_PROVIDER"];
      delete process.env["BACKEND_STORAGE_PROVIDER"];

      const adapters = createBackendAdapters();

      // auth and storage are factory functions (not instances) — SupabaseClient is request-scoped
      expect(typeof adapters.auth).toBe("function");
      expect(typeof adapters.storage).toBe("function");
      // session is a constructed instance
      expect(typeof adapters.session).toBe("object");
      expect(typeof adapters.session.refreshSession).toBe("function");
    });

    it("auth factory returns an AuthPort adapter when called with a mock client", () => {
      process.env["NEXT_PUBLIC_SUPABASE_URL"] = "https://test.supabase.co";
      process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] = "test-anon-key";

      const adapters = createBackendAdapters();
      const mockClient = {} as import("@supabase/supabase-js").SupabaseClient;
      const authAdapter = adapters.auth(mockClient);

      // Verify it's an AuthPort (has all 7 methods)
      expect(typeof authAdapter.signInWithPassword).toBe("function");
      expect(typeof authAdapter.signUp).toBe("function");
      expect(typeof authAdapter.signOut).toBe("function");
      expect(typeof authAdapter.getUser).toBe("function");
      expect(typeof authAdapter.getUserRole).toBe("function");
      expect(typeof authAdapter.requestPasswordReset).toBe("function");
      expect(typeof authAdapter.updatePassword).toBe("function");
    });

    it("storage factory returns a StoragePort adapter when called with a mock client", () => {
      process.env["NEXT_PUBLIC_SUPABASE_URL"] = "https://test.supabase.co";
      process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] = "test-anon-key";

      const adapters = createBackendAdapters();
      const mockClient = {} as import("@supabase/supabase-js").SupabaseClient;
      const storageAdapter = adapters.storage(mockClient);

      // Verify it's a StoragePort (has all 6 methods)
      expect(typeof storageAdapter.upload).toBe("function");
      expect(typeof storageAdapter.download).toBe("function");
      expect(typeof storageAdapter.delete).toBe("function");
      expect(typeof storageAdapter.getSignedUrl).toBe("function");
      expect(typeof storageAdapter.getPublicUrl).toBe("function");
      expect(typeof storageAdapter.listFiles).toBe("function");
    });
  });

  describe("unknown provider throws descriptive error", () => {
    it("throws with clear guidance when BACKEND_AUTH_PROVIDER is unknown", () => {
      process.env["NEXT_PUBLIC_SUPABASE_URL"] = "https://test.supabase.co";
      process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] = "test-anon-key";
      process.env["BACKEND_AUTH_PROVIDER"] = "firebase";

      expect(() => createBackendAdapters()).toThrow(/Unknown BACKEND_AUTH_PROVIDER.*firebase/i);
    });

    it("throws with clear guidance when BACKEND_STORAGE_PROVIDER is unknown", () => {
      process.env["NEXT_PUBLIC_SUPABASE_URL"] = "https://test.supabase.co";
      process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] = "test-anon-key";
      delete process.env["BACKEND_AUTH_PROVIDER"];
      process.env["BACKEND_STORAGE_PROVIDER"] = "s3";

      expect(() => createBackendAdapters()).toThrow(/Unknown BACKEND_STORAGE_PROVIDER.*s3/i);
    });
  });

  describe("missing supabase credentials (lazy session resolution)", () => {
    it("does NOT throw at creation when NEXT_PUBLIC_SUPABASE_URL is missing", () => {
      delete process.env["NEXT_PUBLIC_SUPABASE_URL"];
      process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] = "test-anon-key";
      delete process.env["BACKEND_AUTH_PROVIDER"];
      delete process.env["BACKEND_STORAGE_PROVIDER"];

      // Session credentials are resolved lazily on refreshSession(), so the
      // factory must be safe to call at module load (e.g. during `next build`).
      expect(() => createBackendAdapters()).not.toThrow();
      expect(createBackendAdapters().session).toBeDefined();
    });

    it("does NOT throw at creation when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing", () => {
      process.env["NEXT_PUBLIC_SUPABASE_URL"] = "https://test.supabase.co";
      delete process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];
      delete process.env["BACKEND_AUTH_PROVIDER"];
      delete process.env["BACKEND_STORAGE_PROVIDER"];

      expect(() => createBackendAdapters()).not.toThrow();
      expect(createBackendAdapters().session).toBeDefined();
    });
  });
});
