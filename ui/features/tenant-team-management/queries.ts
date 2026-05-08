import "server-only";

import type { TenantInvitationOutput, TenantMemberOutput } from "@enterprise/contracts";
import {
  listTenantInvitations,
  listTenantMembers,
} from "@enterprise/core/services/tenant-team-service";
import { getServerClient } from "@enterprise/core/supabase/server";

export async function getTeamMembers(tenantId: string): Promise<TenantMemberOutput[]> {
  const supabase = await getServerClient();
  const result = await listTenantMembers(supabase, tenantId);

  if (!result.success) {
    throw new Error(result.error);
  }

  return result.data;
}

export async function getTeamInvitations(tenantId: string): Promise<TenantInvitationOutput[]> {
  const supabase = await getServerClient();
  const result = await listTenantInvitations(supabase, tenantId);

  if (!result.success) {
    throw new Error(result.error);
  }

  return result.data;
}
