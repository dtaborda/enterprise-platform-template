import "server-only";

import type { WorkspaceSettings } from "@enterprise/core/services";
import { getWorkspaceSettings } from "@enterprise/core/services";
import { getServerClient } from "@enterprise/core/supabase/server";

export async function fetchWorkspaceSettings(tenantId: string): Promise<WorkspaceSettings | null> {
  const supabase = await getServerClient();
  const result = await getWorkspaceSettings(supabase, tenantId);

  if (!result.success) return null;
  return result.data;
}
