import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceResult } from "../auth-service";
import type {
  StorageFileEntry,
  StoragePort,
  StoragePublicUrlResult,
  StorageSignedUrlResult,
  StorageUploadOptions,
  StorageUploadResult,
} from "../ports/storage-port";

/**
 * SupabaseStorageAdapter — implements StoragePort using the Supabase Storage API.
 *
 * Construction requires a SupabaseClient. In practice this is the server client
 * from `getServerClient()` (authenticated user context) or the admin client for
 * service-role operations.
 *
 * Bucket and path naming conventions follow `STORAGE_BUCKETS` and `STORAGE_PATHS`
 * from `packages/core/src/supabase/storage-paths.ts`. These constants are
 * provider-agnostic — they are just naming conventions that any adapter can use.
 */
export class SupabaseStorageAdapter implements StoragePort {
  constructor(private readonly client: SupabaseClient) {}

  async upload(
    bucket: string,
    path: string,
    file: Blob | File | ArrayBuffer,
    options?: StorageUploadOptions,
  ): Promise<ServiceResult<StorageUploadResult>> {
    const { data, error } = await this.client.storage.from(bucket).upload(path, file, {
      contentType: options?.contentType,
      upsert: options?.upsert ?? true,
    });

    if (error) {
      return {
        success: false,
        error: `Upload failed: ${error.message}`,
        code: "STORAGE_UPLOAD_FAILED",
      };
    }

    return {
      success: true,
      data: { path: data.path, fullPath: data.fullPath },
    };
  }

  async download(bucket: string, path: string): Promise<ServiceResult<Blob>> {
    const { data, error } = await this.client.storage.from(bucket).download(path);

    if (error || !data) {
      return {
        success: false,
        error: `Download failed: ${error?.message ?? "no data"}`,
        code: "STORAGE_DOWNLOAD_FAILED",
      };
    }

    return { success: true, data };
  }

  async delete(bucket: string, paths: string[]): Promise<ServiceResult<null>> {
    const { error } = await this.client.storage.from(bucket).remove(paths);

    if (error) {
      return {
        success: false,
        error: `Delete failed: ${error.message}`,
        code: "STORAGE_DELETE_FAILED",
      };
    }

    return { success: true, data: null };
  }

  async getSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number,
  ): Promise<ServiceResult<StorageSignedUrlResult>> {
    const { data, error } = await this.client.storage.from(bucket).createSignedUrl(path, expiresIn);

    if (error || !data) {
      return {
        success: false,
        error: `Signed URL failed: ${error?.message ?? "no data"}`,
        code: "STORAGE_SIGNED_URL_FAILED",
      };
    }

    return {
      success: true,
      data: { signedUrl: data.signedUrl, expiresIn },
    };
  }

  async getPublicUrl(bucket: string, path: string): Promise<ServiceResult<StoragePublicUrlResult>> {
    // Note: Supabase getPublicUrl() is synchronous and never returns an error.
    // It constructs the URL from the project URL without making a network call.
    const { data } = this.client.storage.from(bucket).getPublicUrl(path);

    return {
      success: true,
      data: { publicUrl: data.publicUrl },
    };
  }

  async listFiles(
    bucket: string,
    prefix = "",
    limit = 100,
    offset = 0,
  ): Promise<ServiceResult<StorageFileEntry[]>> {
    const { data, error } = await this.client.storage.from(bucket).list(prefix, { limit, offset });

    if (error) {
      return {
        success: false,
        error: `List files failed: ${error.message}`,
        code: "STORAGE_LIST_FAILED",
      };
    }

    const entries: StorageFileEntry[] = (data ?? []).map((item) => ({
      name: item.name,
      id: item.id ?? null,
      updatedAt: item.updated_at ? new Date(item.updated_at) : null,
      createdAt: item.created_at ? new Date(item.created_at) : null,
      size: item.metadata?.size ?? null,
      mimeType: item.metadata?.mimetype ?? null,
    }));

    return { success: true, data: entries };
  }
}
