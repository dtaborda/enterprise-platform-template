import "server-only";

import type { BillingHistoryQueryDto } from "@enterprise/contracts";
import type {
  BillingEventRecord,
  PlanRecord,
  SubscriptionWithPlan,
} from "@enterprise/core/services/billing-service";
import {
  getBillingHistory,
  getSubscription,
  listPlans,
} from "@enterprise/core/services/billing-service";
import { getServerClient } from "@enterprise/core/supabase/server";

export async function getSubscriptionQuery(tenantId: string): Promise<SubscriptionWithPlan | null> {
  const supabase = await getServerClient();
  const result = await getSubscription(supabase, tenantId);
  if (!result.success) return null;
  return result.data;
}

export async function listPlansQuery(): Promise<PlanRecord[]> {
  const supabase = await getServerClient();
  const result = await listPlans(supabase);
  if (!result.success) return [];
  return result.data;
}

export async function getBillingHistoryQuery(
  tenantId: string,
  query: BillingHistoryQueryDto,
): Promise<BillingEventRecord[]> {
  const supabase = await getServerClient();
  const result = await getBillingHistory(supabase, tenantId, query);
  if (!result.success) return [];
  return result.data;
}
