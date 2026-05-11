// Storage paths for Supabase Storage
// Centralized bucket and path definitions

/** Storage bucket names */
export const STORAGE_BUCKETS = {
  AVATARS: "avatars",
  DOCUMENTS: "documents",
  IMAGES: "images",
  WORKSPACE_LOGOS: "workspace-logos",
} as const;

/** Storage path templates */
export const STORAGE_PATHS = {
  /** Avatar path: avatars/{tenantId}/{userId}/avatar.ext */
  avatar: (tenantId: string, userId: string, extension: string) =>
    `${tenantId}/${userId}/avatar.${extension}`,

  /** Document path: documents/{tenantId}/{resourceType}/{resourceId}/{filename} */
  document: (tenantId: string, resourceType: string, resourceId: string, filename: string) =>
    `${tenantId}/${resourceType}/${resourceId}/${filename}`,

  /** Image path: images/{tenantId}/{resourceType}/{resourceId}/{filename} */
  image: (tenantId: string, resourceType: string, resourceId: string, filename: string) =>
    `${tenantId}/${resourceType}/${resourceId}/${filename}`,

  /** Public path for avatars */
  publicAvatar: (tenantId: string, userId: string) =>
    `${STORAGE_BUCKETS.AVATARS}/${tenantId}/${userId}`,

  /** Workspace logo path: workspace-logos/{tenantId}/logo.ext */
  logo: (tenantId: string, extension: string) => `${tenantId}/logo.${extension}`,
} as const;

/** Allowed file extensions by bucket */
export const ALLOWED_EXTENSIONS = {
  [STORAGE_BUCKETS.AVATARS]: ["jpg", "jpeg", "png", "webp", "gif"],
  [STORAGE_BUCKETS.IMAGES]: ["jpg", "jpeg", "png", "webp", "gif", "svg"],
  [STORAGE_BUCKETS.DOCUMENTS]: ["pdf", "doc", "docx", "txt", "xls", "xlsx"],
  [STORAGE_BUCKETS.WORKSPACE_LOGOS]: ["jpg", "jpeg", "png", "webp"],
} as const;

/** Max file sizes in bytes */
export const MAX_FILE_SIZES = {
  [STORAGE_BUCKETS.AVATARS]: 5 * 1024 * 1024, // 5MB
  [STORAGE_BUCKETS.IMAGES]: 10 * 1024 * 1024, // 10MB
  [STORAGE_BUCKETS.DOCUMENTS]: 50 * 1024 * 1024, // 50MB
  [STORAGE_BUCKETS.WORKSPACE_LOGOS]: 2 * 1024 * 1024, // 2MB
} as const;
