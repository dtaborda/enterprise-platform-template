"use server";

import type {
  ActionResult,
  TenantInvitationOutput,
  TenantMemberOutput,
} from "@enterprise/contracts";
import {
  cancelInvitationSchema,
  changeMemberRoleSchema,
  inviteMemberSchema,
  removeMemberSchema,
  resendInvitationSchema,
} from "@enterprise/contracts";
import {
  ConsoleInvitationEmailAdapter,
  changeTenantMemberRole,
  inviteTenantMember,
  removeTenantMember,
  resendTenantInvitation,
  revokeTenantInvitation,
} from "@enterprise/core";
import { getAdminClient } from "@enterprise/core/supabase/admin";
import { getServerClient } from "@enterprise/core/supabase/server";
import { getAppUrl } from "@enterprise/core/utils/env";
import { revalidatePath } from "next/cache";
import { captureActionError } from "@/lib/sentry";

const TEAM_PATH = "/dashboard/team";

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

export async function inviteMemberAction(
  input: Record<string, unknown>,
): Promise<ActionResult<TenantInvitationOutput>> {
  const parsed = inviteMemberSchema.safeParse(input);

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

  if (auth.role !== "owner" && auth.role !== "admin") {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: "Only owners and admins can invite members" },
    };
  }

  try {
    const emailAdapter = new ConsoleInvitationEmailAdapter();
    const result = await inviteTenantMember(
      supabase,
      auth.tenantId,
      auth.userId,
      parsed.data,
      emailAdapter,
      { appUrl: getAppUrl() },
    );

    if (!result.success) {
      return {
        success: false,
        error: { code: result.code ?? "INVITE_FAILED", message: result.error },
      };
    }

    revalidatePath(TEAM_PATH);

    return { success: true, data: result.data };
  } catch (err) {
    captureActionError(err, {
      actionName: "inviteMemberAction",
      area: "team",
      tenantId: auth.tenantId,
      userId: auth.userId,
    });

    return {
      success: false,
      error: { code: "UNEXPECTED_ERROR", message: "An unexpected error occurred" },
    };
  }
}

export async function changeMemberRoleAction(
  input: Record<string, unknown>,
): Promise<ActionResult<TenantMemberOutput>> {
  const parsed = changeMemberRoleSchema.safeParse(input);

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

  if (auth.role !== "owner" && auth.role !== "admin") {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: "Only owners and admins can change member roles" },
    };
  }

  try {
    const adminClient = getAdminClient();
    const result = await changeTenantMemberRole(
      supabase,
      adminClient,
      auth.tenantId,
      auth.userId,
      parsed.data,
    );

    if (!result.success) {
      return {
        success: false,
        error: { code: result.code ?? "ROLE_CHANGE_FAILED", message: result.error },
      };
    }

    revalidatePath(TEAM_PATH);

    return { success: true, data: result.data };
  } catch (err) {
    captureActionError(err, {
      actionName: "changeMemberRoleAction",
      area: "team",
      tenantId: auth.tenantId,
      userId: auth.userId,
    });

    return {
      success: false,
      error: { code: "UNEXPECTED_ERROR", message: "An unexpected error occurred" },
    };
  }
}

export async function removeMemberAction(
  input: Record<string, unknown>,
): Promise<ActionResult<null>> {
  const parsed = removeMemberSchema.safeParse(input);

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

  if (auth.role !== "owner" && auth.role !== "admin") {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: "Only owners and admins can remove members" },
    };
  }

  try {
    const adminClient = getAdminClient();
    const result = await removeTenantMember(
      supabase,
      adminClient,
      auth.tenantId,
      auth.userId,
      parsed.data.userId,
    );

    if (!result.success) {
      return {
        success: false,
        error: { code: result.code ?? "REMOVE_FAILED", message: result.error },
      };
    }

    revalidatePath(TEAM_PATH);

    return { success: true, data: null };
  } catch (err) {
    captureActionError(err, {
      actionName: "removeMemberAction",
      area: "team",
      tenantId: auth.tenantId,
      userId: auth.userId,
    });

    return {
      success: false,
      error: { code: "UNEXPECTED_ERROR", message: "An unexpected error occurred" },
    };
  }
}

export async function cancelInvitationAction(
  input: Record<string, unknown>,
): Promise<ActionResult<null>> {
  const parsed = cancelInvitationSchema.safeParse(input);

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

  if (auth.role !== "owner" && auth.role !== "admin") {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: "Only owners and admins can cancel invitations" },
    };
  }

  try {
    const result = await revokeTenantInvitation(supabase, auth.tenantId, parsed.data);

    if (!result.success) {
      return {
        success: false,
        error: { code: result.code ?? "CANCEL_FAILED", message: result.error },
      };
    }

    revalidatePath(TEAM_PATH);

    return { success: true, data: null };
  } catch (err) {
    captureActionError(err, {
      actionName: "cancelInvitationAction",
      area: "team",
      tenantId: auth.tenantId,
      userId: auth.userId,
    });

    return {
      success: false,
      error: { code: "UNEXPECTED_ERROR", message: "An unexpected error occurred" },
    };
  }
}

export async function resendInvitationAction(
  input: Record<string, unknown>,
): Promise<ActionResult<TenantInvitationOutput>> {
  const parsed = resendInvitationSchema.safeParse(input);

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

  if (auth.role !== "owner" && auth.role !== "admin") {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: "Only owners and admins can resend invitations" },
    };
  }

  try {
    const emailAdapter = new ConsoleInvitationEmailAdapter();
    const result = await resendTenantInvitation(
      supabase,
      auth.tenantId,
      parsed.data,
      emailAdapter,
      {
        appUrl: getAppUrl(),
      },
    );

    if (!result.success) {
      return {
        success: false,
        error: { code: result.code ?? "RESEND_FAILED", message: result.error },
      };
    }

    revalidatePath(TEAM_PATH);

    return { success: true, data: result.data };
  } catch (err) {
    captureActionError(err, {
      actionName: "resendInvitationAction",
      area: "team",
      tenantId: auth.tenantId,
      userId: auth.userId,
    });

    return {
      success: false,
      error: { code: "UNEXPECTED_ERROR", message: "An unexpected error occurred" },
    };
  }
}
