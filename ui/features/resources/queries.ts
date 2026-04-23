import "server-only";

import type { ResourceEntity, ResourceQueryDto } from "@enterprise/contracts";
import {
  getResourceById as getResourceByIdService,
  listResources,
} from "@enterprise/core/services/resource-service";
import { getServerClient } from "@enterprise/core/supabase/server";

export async function getResources(
  filters?: ResourceQueryDto,
): Promise<{ items: ResourceEntity[]; total: number }> {
  const supabase = await getServerClient();
  const result = await listResources(supabase, filters);

  if (!result.success) {
    throw new Error(result.error);
  }

  return result.data;
}

export async function getResourceById(id: string): Promise<ResourceEntity | null> {
  const supabase = await getServerClient();
  const result = await getResourceByIdService(supabase, id);

  if (!result.success) {
    if (result.code === "not_found") {
      return null;
    }
    throw new Error(result.error);
  }

  return result.data;
}
