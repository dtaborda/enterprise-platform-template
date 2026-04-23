export const RESOURCE_TYPE = {
  PRODUCT: "product",
  SERVICE: "service",
  ASSET: "asset",
  DOCUMENT: "document",
  OTHER: "other",
} as const;

export type ResourceType = (typeof RESOURCE_TYPE)[keyof typeof RESOURCE_TYPE];

export const RESOURCE_STATUS = {
  ACTIVE: "active",
  DRAFT: "draft",
  ARCHIVED: "archived",
  SUSPENDED: "suspended",
} as const;

export type ResourceStatus = (typeof RESOURCE_STATUS)[keyof typeof RESOURCE_STATUS];

export interface ResourceEntity {
  id: string;
  tenantId: string;
  title: string;
  type: ResourceType;
  status: ResourceStatus;
  description: string | null;
  metadata: string | null;
  imageUrls: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
