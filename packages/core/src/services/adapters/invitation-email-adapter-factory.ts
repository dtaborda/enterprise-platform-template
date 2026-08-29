// Invitation email adapter factory — selects the correct adapter based on env var presence
// RESEND_API_KEY present → ResendInvitationEmailAdapter; absent → ConsoleInvitationEmailAdapter
// Adapter is singleton-cached per process (serverless-safe — each cold start gets fresh selection)

import { getEmailFrom } from "../../utils/env";
import type { InvitationEmailPort } from "../ports/invitation-email-port";
import { ConsoleInvitationEmailAdapter } from "./console-invitation-email-adapter";
import { ResendInvitationEmailAdapter } from "./resend-invitation-email-adapter";

let cachedAdapter: InvitationEmailPort | null = null;

/**
 * Returns the appropriate invitation email adapter based on env var presence.
 * Selection is based on RESEND_API_KEY, NOT NODE_ENV.
 * Cached per process — multiple calls return the same instance.
 *
 * Env reading lives here, not in the adapters: the adapters receive their
 * credentials via constructor so they stay pure and testable.
 *
 * Throws when RESEND_API_KEY is set but EMAIL_FROM is missing — sending from an
 * unverified domain fails silently at the provider, so it must fail loudly here.
 */
export function createInvitationEmailAdapter(): InvitationEmailPort {
  if (cachedAdapter) return cachedAdapter;

  const resendKey = process.env["RESEND_API_KEY"];

  cachedAdapter = resendKey
    ? new ResendInvitationEmailAdapter(resendKey, getEmailFrom())
    : new ConsoleInvitationEmailAdapter();

  return cachedAdapter;
}
