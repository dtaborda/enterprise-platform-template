"use server";

import {
  type ActionResult,
  type CreateResourceDto,
  createResourceSchema,
  type ResourceEntity,
  updateResourceSchema,
} from "@enterprise/contracts";
import {
  createResource,
  deleteResource,
  getResourceById,
  updateResource,
} from "@enterprise/core/services/resource-service";
import { getServerClient } from "@enterprise/core/supabase/server";
import { revalidatePath } from "next/cache";

const RESOURCES_PATH = "/dashboard/resources";

async function getAuthContext(supabase: Awaited<ReturnType<typeof getServerClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // tenantId is read from app_metadata (matches RLS claim source)
  const tenantId = (user.app_metadata?.["tenant_id"] as string | undefined) ?? null;

  return { userId: user.id, tenantId };
}

export async function createResourceAction(
  input: Record<string, unknown>,
): Promise<ActionResult<ResourceEntity>> {
  const parsed = createResourceSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        details: parsed.error.flatten().fieldErrors as Record<string, unknown>,
      },
    };
  }

  const supabase = await getServerClient();
  const auth = await getAuthContext(supabase);

  if (!auth?.tenantId) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    };
  }

  const result = await createResource(
    supabase,
    auth.tenantId,
    auth.userId,
    parsed.data as CreateResourceDto,
  );

  if (!result.success) {
    return {
      success: false,
      error: { code: result.code ?? "CREATE_FAILED", message: result.error },
    };
  }

  revalidatePath(RESOURCES_PATH);

  return { success: true, data: result.data };
}

export async function updateResourceAction(
  id: string,
  input: Record<string, unknown>,
): Promise<ActionResult<ResourceEntity>> {
  const parsed = updateResourceSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        details: parsed.error.flatten().fieldErrors as Record<string, unknown>,
      },
    };
  }

  const supabase = await getServerClient();
  const auth = await getAuthContext(supabase);

  if (!auth) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    };
  }

  const result = await updateResource(supabase, id, parsed.data);

  if (!result.success) {
    return {
      success: false,
      error: { code: result.code ?? "UPDATE_FAILED", message: result.error },
    };
  }

  revalidatePath(RESOURCES_PATH);
  revalidatePath(`${RESOURCES_PATH}/${id}`);

  return { success: true, data: result.data };
}

export async function deleteResourceAction(id: string): Promise<ActionResult<null>> {
  const supabase = await getServerClient();
  const auth = await getAuthContext(supabase);

  if (!auth) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    };
  }

  const existsResult = await getResourceById(supabase, id);

  if (!existsResult.success) {
    return {
      success: false,
      error: { code: existsResult.code ?? "NOT_FOUND", message: existsResult.error },
    };
  }

  const result = await deleteResource(supabase, id);

  if (!result.success) {
    return {
      success: false,
      error: { code: result.code ?? "DELETE_FAILED", message: result.error },
    };
  }

  revalidatePath(RESOURCES_PATH);

  return { success: true, data: null };
}
