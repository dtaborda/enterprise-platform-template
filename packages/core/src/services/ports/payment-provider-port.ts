// Payment provider port interface
// Implement this interface to swap payment adapters per environment
// All adapter-facing params use planSlug (not planId) — internal UUIDs stay internal

export interface CreateCustomerParams {
  tenantId: string;
  tenantName: string;
  email: string;
}

export interface CreateSubscriptionParams {
  customerId: string;
  planSlug: string;
  billingCycle: "monthly" | "yearly";
}

export interface ChangePlanParams {
  subscriptionId: string;
  newPlanSlug: string;
}

export interface CancelSubscriptionParams {
  subscriptionId: string;
  cancelAtPeriodEnd: boolean;
}

export interface ResumeSubscriptionParams {
  subscriptionId: string;
}

export interface PortalUrlParams {
  customerId: string;
  returnUrl: string;
}

export interface PaymentProviderPort {
  createCustomer(params: CreateCustomerParams): Promise<{ customerId: string }>;
  createSubscription(params: CreateSubscriptionParams): Promise<{
    subscriptionId: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
  }>;
  changePlan(params: ChangePlanParams): Promise<{ success: boolean }>;
  cancelSubscription(params: CancelSubscriptionParams): Promise<{ success: boolean }>;
  resumeSubscription(params: ResumeSubscriptionParams): Promise<{ success: boolean }>;
  getPortalUrl(params: PortalUrlParams): Promise<{ url: string }>;
  verifyWebhookSignature(payload: string, signature: string): Promise<boolean>;
}
