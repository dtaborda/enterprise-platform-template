import { createPaymentAdapter } from "@enterprise/core/services/adapters/payment-adapter-factory";
import { processWebhookEvent } from "@enterprise/core/services/billing-service";
import { getAdminClient } from "@enterprise/core/supabase/admin";

// Webhook Route Handler — NOT a Server Action
// Sits outside (protected)/ — no auth middleware applies
// Raw body is required for Stripe signature verification

function extractExternalSubscriptionId(event: Record<string, unknown>): string {
  const data = event["data"] as Record<string, unknown> | undefined;
  const obj = data?.["object"] as Record<string, unknown> | undefined;
  return (obj?.["subscription"] as string | undefined) ?? "";
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("stripe-signature") ?? "";

    const adapter = createPaymentAdapter();
    const isValid = await adapter.verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse the raw event payload
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const adminClient = getAdminClient();
    const result = await processWebhookEvent(adminClient, {
      eventType: (event["type"] as string | undefined) ?? "unknown",
      externalEventId: (event["id"] as string | undefined) ?? "",
      externalSubscriptionId: extractExternalSubscriptionId(event),
      provider: "stripe",
      payload: event,
    });

    if (!result.success) {
      // Log failures but still return 200 — prevents provider retry loops for non-transient errors
      console.error("[webhook/billing] Processing failed:", result.error, result.code);
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("[webhook/billing] Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
