import type { ServiceResult } from "../auth-service";

/**
 * Metadata passed when uploading a file.
 */
export interface StorageUploadOptions {
  /** MIME type of the file, e.g. "image/png". */
  contentType?: string;
  /** Whether to overwrite an existing file at the same path. Default: true. */
  upsert?: boolean;
}

/**
 * Result of a successful upload.
 */
export interface StorageUploadResult {
  /** Full storage path (bucket-relative) of the uploaded file. */
  path: string;
  /** Full URL of the uploaded file (public or signed depending on bucket config). */
  fullPath: string;
}

/**
 * Result of a signed URL generation.
 */
export interface StorageSignedUrlResult {
  /** Signed URL valid for the requested duration. */
  signedUrl: string;
  /** Expiry time in seconds from now. */
  expiresIn: number;
}

/**
 * Result of a public URL lookup (no expiry, no signature).
 */
export interface StoragePublicUrlResult {
  /** Public URL for the file. Only valid if the bucket is configured as public. */
  publicUrl: string;
}

/**
 * A file entry returned by listFiles.
 */
export interface StorageFileEntry {
  name: string;
  id: string | null;
  updatedAt: Date | null;
  createdAt: Date | null;
  /** File size in bytes. null for folders. */
  size: number | null;
  mimeType: string | null;
}

/**
 * StoragePort — provider-agnostic file storage interface.
 *
 * Implement this interface to swap the storage backend (Supabase Storage, S3,
 * Cloudflare R2, local filesystem) without modifying any service or Server Action.
 *
 * The `bucket` parameter always corresponds to a value from `STORAGE_BUCKETS` in
 * `packages/core/src/supabase/storage-paths.ts`. The path parameters follow the
 * conventions defined by `STORAGE_PATHS`. These constants are provider-agnostic
 * naming conventions — they remain unchanged regardless of which adapter is active.
 *
 * All methods return `ServiceResult<T>`. Adapters MUST NOT throw; they return
 * `{ success: false, error: string, code: string }` on failure.
 */
export interface StoragePort {
  /**
   * Uploads a file to the specified bucket at the given path.
   * @param bucket - The target bucket name (from STORAGE_BUCKETS).
   * @param path - The bucket-relative path (from STORAGE_PATHS helpers).
   * @param file - The file content as Blob, File, or ArrayBuffer.
   * @param options - Optional content-type and upsert flag.
   */
  upload(
    bucket: string,
    path: string,
    file: Blob | File | ArrayBuffer,
    options?: StorageUploadOptions,
  ): Promise<ServiceResult<StorageUploadResult>>;

  /**
   * Downloads a file from the specified bucket.
   * @param bucket - The source bucket name.
   * @param path - The bucket-relative path.
   * @returns The file as a Blob.
   */
  download(bucket: string, path: string): Promise<ServiceResult<Blob>>;

  /**
   * Deletes one or more files from the specified bucket.
   * @param bucket - The source bucket name.
   * @param paths - One or more bucket-relative paths.
   */
  delete(bucket: string, paths: string[]): Promise<ServiceResult<null>>;

  /**
   * Generates a time-limited signed URL for a private file.
   * @param bucket - The source bucket name.
   * @param path - The bucket-relative path.
   * @param expiresIn - URL validity duration in seconds.
   */
  getSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number,
  ): Promise<ServiceResult<StorageSignedUrlResult>>;

  /**
   * Returns the public URL for a file in a public bucket.
   * This does not make a network call — it constructs the URL from the provider's
   * base URL and the bucket/path. Only valid for publicly accessible buckets.
   * @param bucket - The source bucket name.
   * @param path - The bucket-relative path.
   */
  getPublicUrl(bucket: string, path: string): Promise<ServiceResult<StoragePublicUrlResult>>;

  /**
   * Lists files in the specified bucket at the given prefix path.
   * @param bucket - The source bucket name.
   * @param prefix - The path prefix to list under. Defaults to root ("").
   * @param limit - Maximum number of entries to return. Defaults to 100.
   * @param offset - Pagination offset. Defaults to 0.
   */
  listFiles(
    bucket: string,
    prefix?: string,
    limit?: number,
    offset?: number,
  ): Promise<ServiceResult<StorageFileEntry[]>>;
}
