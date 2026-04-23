import type {
  CreateResourceDto,
  ResourceEntity,
  ResourceQueryDto,
  UpdateResourceDto,
} from "@enterprise/contracts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceResult } from "./auth-service";

function mapRow(row: Record<string, unknown>): ResourceEntity {
  return {
    id: row["id"] as string,
    tenantId: row["tenant_id"] as string,
    title: row["title"] as string,
    type: row["type"] as ResourceEntity["type"],
    status: row["status"] as ResourceEntity["status"],
    description: (row["description"] as string | null) ?? null,
    metadata: (row["metadata"] as string | null) ?? null,
    imageUrls: (row["image_urls"] as string | null) ?? null,
    createdBy: row["created_by"] as string,
    createdAt: row["created_at"] as Date,
    updatedAt: row["updated_at"] as Date,
  };
}

async function writeAuditLog(
  client: SupabaseClient,
  tenantId: string,
  userId: string,
  action: "create" | "update" | "delete",
  resourceId: string,
): Promise<void> {
  const { error } = await client.from("audit_log").insert({
    tenant_id: tenantId,
    user_id: userId,
    action,
    resource: "resources",
    resource_id: resourceId,
    metadata: null,
    ip_address: null,
    user_agent: null,
  });

  if (error) {
    console.error(`Failed to write audit log [${action}:resources:${resourceId}]:`, error);
  }
}

export async function listResources(
  client: SupabaseClient,
  filters?: ResourceQueryDto,
): Promise<ServiceResult<{ items: ResourceEntity[]; total: number }>> {
  const limit = filters?.limit ?? 20;
  const offset = filters?.offset ?? 0;

  let query = client.from("resources").select("*", { count: "exact" });

  if (filters?.type) {
    query = query.eq("type", filters.type);
  }

  if (filters?.status) {
    query = query.eq("status", filters.status);
  } else {
    query = query.neq("status", "archived");
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    return { success: false, error: error.message, code: "LIST_FAILED" };
  }

  const items = (data ?? []).map((row) => mapRow(row as Record<string, unknown>));

  return { success: true, data: { items, total: count ?? 0 } };
}

export async function getResourceById(
  client: SupabaseClient,
  id: string,
): Promise<ServiceResult<ResourceEntity>> {
  const { data, error } = await client.from("resources").select("*").eq("id", id).single();

  if (error) {
    return { success: false, error: error.message, code: "FETCH_FAILED" };
  }

  if (!data) {
    return { success: false, error: "Resource not found", code: "not_found" };
  }

  return { success: true, data: mapRow(data as Record<string, unknown>) };
}

export async function createResource(
  client: SupabaseClient,
  tenantId: string,
  userId: string,
  input: CreateResourceDto,
): Promise<ServiceResult<ResourceEntity>> {
  const { imageUrls, metadata, ...rest } = input;

  const insertPayload = {
    tenant_id: tenantId,
    created_by: userId,
    title: rest.title,
    type: rest.type,
    status: rest.status ?? "active",
    description: rest.description ?? null,
    metadata: metadata ? JSON.stringify(metadata) : null,
    image_urls: imageUrls ? JSON.stringify(imageUrls) : null,
  };

  const { data, error } = await client.from("resources").insert(insertPayload).select().single();

  if (error) {
    return { success: false, error: error.message, code: "CREATE_FAILED" };
  }

  if (!data) {
    return { success: false, error: "Resource was not created", code: "CREATE_FAILED" };
  }

  const entity = mapRow(data as Record<string, unknown>);

  void writeAuditLog(client, tenantId, userId, "create", entity.id).catch(console.error);

  return { success: true, data: entity };
}

export async function updateResource(
  client: SupabaseClient,
  id: string,
  input: UpdateResourceDto,
): Promise<ServiceResult<ResourceEntity>> {
  const updatePayload: Record<string, unknown> = {};

  if (input.title !== undefined) updatePayload["title"] = input.title;
  if (input.type !== undefined) updatePayload["type"] = input.type;
  if (input.status !== undefined) updatePayload["status"] = input.status;
  if (input.description !== undefined) updatePayload["description"] = input.description;
  if (input.metadata !== undefined) {
    updatePayload["metadata"] = input.metadata ? JSON.stringify(input.metadata) : null;
  }
  if (input.imageUrls !== undefined) {
    updatePayload["image_urls"] = input.imageUrls ? JSON.stringify(input.imageUrls) : null;
  }

  const { data, error } = await client
    .from("resources")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message, code: "UPDATE_FAILED" };
  }

  if (!data) {
    return { success: false, error: "Resource not found after update", code: "not_found" };
  }

  const entity = mapRow(data as Record<string, unknown>);

  void writeAuditLog(client, entity.tenantId, entity.createdBy, "update", entity.id).catch(
    console.error,
  );

  return { success: true, data: entity };
}

export async function deleteResource(
  client: SupabaseClient,
  id: string,
): Promise<ServiceResult<null>> {
  const { data, error } = await client
    .from("resources")
    .update({ status: "archived" })
    .eq("id", id)
    .select("id, tenant_id, created_by")
    .single();

  if (error) {
    return { success: false, error: error.message, code: "DELETE_FAILED" };
  }

  if (data) {
    const row = data as Record<string, unknown>;
    void writeAuditLog(
      client,
      row["tenant_id"] as string,
      row["created_by"] as string,
      "delete",
      id,
    ).catch(console.error);
  }

  return { success: true, data: null };
}
