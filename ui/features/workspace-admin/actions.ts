"use server";

import type { ActionResult } from "@enterprise/contracts";
import {
  updateWorkspaceProfileSchema,
  updateWorkspaceRegionalSchema,
  updateWorkspaceSecuritySchema,
  updateWorkspaceSlugSchema,
} from "@enterprise/contracts";
import {
  removeWorkspaceLogo,
  updateWorkspaceProfile,
  updateWorkspaceRegional,
  updateWorkspaceSecurity,
  updateWorkspaceSlug,
  uploadWorkspaceLogo,
} from "@enterprise/core/services";
import { getAdminClient } from "@enterprise/core/supabase/admin";
import { getServerClient } from "@enterprise/core/supabase/server";
import { revalidatePath } from "next/cache";
import { ROUTES } from "@/lib/routes";
import { captureActionError } from "@/lib/sentry";

// ─── Auth Context ─────────────────────────────────────────────────────────────

async function getAuthContext(supabase: Awaited<ReturnType<typeof getServerClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const tenantId = (user.app_metadata?.["tenant_id"] as string | undefined) ?? null;
  const role = (user.app_metadata?.["role"] as string | undefined) ?? null;

  return { userId: user.id, tenantId, role };
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function updateWorkspaceProfileAction(
  input: Record<string, unknown>,
): Promise<ActionResult<{ name: string }>> {
  const parsed = updateWorkspaceProfileSchema.safeParse(input);

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

  if (!auth?.tenantId || !auth.role) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    };
  }

  try {
    const adminClient = getAdminClient();
    const result = await updateWorkspaceProfile(
      adminClient,
      auth.tenantId,
      auth.userId,
      auth.role,
      parsed.data,
    );

    if (!result.success) {
      return {
        success: false,
        error: { code: result.code ?? "UPDATE_FAILED", message: result.error },
      };
    }

    revalidatePath(ROUTES.settings);
    return { success: true, data: result.data };
  } catch (err) {
    captureActionError(err, {
      actionName: "updateWorkspaceProfileAction",
      area: "settings",
      tenantId: auth.tenantId,
      userId: auth.userId,
      userRole: auth.role,
      inputShape: Object.keys(parsed.data),
    });

    return {
      success: false,
      error: { code: "UNEXPECTED_ERROR", message: "An unexpected error occurred" },
    };
  }
}

export async function updateWorkspaceSlugAction(
  input: Record<string, unknown>,
): Promise<ActionResult<{ slug: string }>> {
  const parsed = updateWorkspaceSlugSchema.safeParse(input);

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

  if (!auth?.tenantId || !auth.role) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    };
  }

  try {
    const adminClient = getAdminClient();
    const result = await updateWorkspaceSlug(
      adminClient,
      auth.tenantId,
      auth.userId,
      auth.role,
      parsed.data,
    );

    if (!result.success) {
      return {
        success: false,
        error: { code: result.code ?? "UPDATE_FAILED", message: result.error },
      };
    }

    revalidatePath(ROUTES.settings);
    return { success: true, data: result.data };
  } catch (err) {
    captureActionError(err, {
      actionName: "updateWorkspaceSlugAction",
      area: "settings",
      tenantId: auth.tenantId,
      userId: auth.userId,
      userRole: auth.role,
      inputShape: Object.keys(parsed.data),
    });

    return {
      success: false,
      error: { code: "UNEXPECTED_ERROR", message: "An unexpected error occurred" },
    };
  }
}

export async function uploadWorkspaceLogoAction(
  formData: FormData,
): Promise<ActionResult<{ logoUrl: string }>> {
  const supabase = await getServerClient();
  const auth = await getAuthContext(supabase);

  if (!auth?.tenantId || !auth.role) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    };
  }

  const file = formData.get("file") as File | null;

  if (!file || !(file instanceof File)) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "No file provided" },
    };
  }

  try {
    const adminClient = getAdminClient();
    const result = await uploadWorkspaceLogo(
      supabase,
      adminClient,
      auth.tenantId,
      auth.userId,
      auth.role,
      file,
    );

    if (!result.success) {
      return {
        success: false,
        error: { code: result.code ?? "UPLOAD_FAILED", message: result.error },
      };
    }

    revalidatePath(ROUTES.settings);
    return { success: true, data: result.data };
  } catch (err) {
    captureActionError(err, {
      actionName: "uploadWorkspaceLogoAction",
      area: "settings",
      tenantId: auth.tenantId,
      userId: auth.userId,
      userRole: auth.role,
    });

    return {
      success: false,
      error: { code: "UNEXPECTED_ERROR", message: "An unexpected error occurred" },
    };
  }
}

export async function removeWorkspaceLogoAction(): Promise<ActionResult<null>> {
  const supabase = await getServerClient();
  const auth = await getAuthContext(supabase);

  if (!auth?.tenantId || !auth.role) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    };
  }

  try {
    const adminClient = getAdminClient();
    const result = await removeWorkspaceLogo(
      supabase,
      adminClient,
      auth.tenantId,
      auth.userId,
      auth.role,
    );

    if (!result.success) {
      return {
        success: false,
        error: { code: result.code ?? "REMOVE_FAILED", message: result.error },
      };
    }

    revalidatePath(ROUTES.settings);
    return { success: true, data: null };
  } catch (err) {
    captureActionError(err, {
      actionName: "removeWorkspaceLogoAction",
      area: "settings",
      tenantId: auth.tenantId,
      userId: auth.userId,
      userRole: auth.role,
    });

    return {
      success: false,
      error: { code: "UNEXPECTED_ERROR", message: "An unexpected error occurred" },
    };
  }
}

export async function updateWorkspaceRegionalAction(
  input: Record<string, unknown>,
): Promise<ActionResult<{ timezone: string; locale: string }>> {
  const parsed = updateWorkspaceRegionalSchema.safeParse(input);

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

  if (!auth?.tenantId || !auth.role) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    };
  }

  try {
    const adminClient = getAdminClient();
    const result = await updateWorkspaceRegional(
      adminClient,
      auth.tenantId,
      auth.userId,
      auth.role,
      parsed.data,
    );

    if (!result.success) {
      return {
        success: false,
        error: { code: result.code ?? "UPDATE_FAILED", message: result.error },
      };
    }

    revalidatePath(ROUTES.settings);
    return { success: true, data: result.data };
  } catch (err) {
    captureActionError(err, {
      actionName: "updateWorkspaceRegionalAction",
      area: "settings",
      tenantId: auth.tenantId,
      userId: auth.userId,
      userRole: auth.role,
      inputShape: Object.keys(parsed.data),
    });

    return {
      success: false,
      error: { code: "UNEXPECTED_ERROR", message: "An unexpected error occurred" },
    };
  }
}

export async function updateWorkspaceSecurityAction(
  input: Record<string, unknown>,
): Promise<ActionResult<{ allowAdminInvites: boolean }>> {
  const parsed = updateWorkspaceSecuritySchema.safeParse(input);

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

  if (!auth?.tenantId || !auth.role) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    };
  }

  try {
    const adminClient = getAdminClient();
    const result = await updateWorkspaceSecurity(
      adminClient,
      auth.tenantId,
      auth.userId,
      auth.role,
      parsed.data,
    );

    if (!result.success) {
      return {
        success: false,
        error: { code: result.code ?? "UPDATE_FAILED", message: result.error },
      };
    }

    revalidatePath(ROUTES.settings);
    return { success: true, data: result.data };
  } catch (err) {
    captureActionError(err, {
      actionName: "updateWorkspaceSecurityAction",
      area: "settings",
      tenantId: auth.tenantId,
      userId: auth.userId,
      userRole: auth.role,
      inputShape: Object.keys(parsed.data),
    });

    return {
      success: false,
      error: { code: "UNEXPECTED_ERROR", message: "An unexpected error occurred" },
    };
  }
}
