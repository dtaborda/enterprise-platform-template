# Delta for Billing

## ADDED Requirements

### Requirement: Billing Notification Dispatch

After each successful billing mutation, billing-service MUST call `createNotification()` or `createBulkNotifications()` to notify affected users.

Calls MUST be wrapped in `try/catch`. A notification dispatch failure MUST NOT cause the billing mutation to fail.

#### Scenario: billing_past_due dispatches to owner and admins

- GIVEN `processWebhookEvent` transitions a subscription to `past_due`
- WHEN the state change is persisted
- THEN `createBulkNotifications` is called with `type: "billing_past_due"` for the owner AND all admin users of the tenant
- AND both in-app and email are dispatched (critical — bypasses preferences)
- AND if `createBulkNotifications` throws, the webhook processing still returns success

#### Scenario: billing_canceled dispatches to owner and admins

- GIVEN `cancelSubscription` succeeds
- WHEN the cancellation is persisted
- THEN `createBulkNotifications` is called with `type: "billing_canceled"` for owner AND all admins
- AND both in-app and email are dispatched (critical)

#### Scenario: billing_plan_upgraded dispatches to owner

- GIVEN `changePlan` upgrades a plan
- WHEN the plan change is persisted
- THEN `createNotification` is called with `type: "billing_plan_upgraded"` for the tenant owner
- AND `metadata` includes `JSON.stringify({ fromPlanId, toPlanId })`

#### Scenario: billing_plan_downgraded dispatches to owner

- GIVEN `changePlan` downgrades a plan
- WHEN the plan change is persisted
- THEN `createNotification` is called with `type: "billing_plan_downgraded"` for the owner

#### Scenario: billing_activated dispatches to owner

- GIVEN `processWebhookEvent` activates a subscription
- WHEN the activation is persisted
- THEN `createNotification` is called with `type: "billing_activated"` for the owner

#### Scenario: Notification failure is non-blocking

- GIVEN `createNotification` throws an error
- WHEN called after a `changePlan` mutation
- THEN the plan change is NOT rolled back
- AND the error is logged to Sentry
- AND `billing-service` returns success to its caller
