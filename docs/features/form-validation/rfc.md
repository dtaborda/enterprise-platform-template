# RFC — Form Validation UX System Architecture

## 1. Summary

This document defines how form validation will be architected across the Enterprise Platform to provide consistent, accessible, inline error feedback on every form.

The system will:

- Provide shared `FormField` and `FormMessage` components in `@enterprise/ui`
- Extract a typed `getFieldError` utility and `FieldErrors` type to `@enterprise/contracts`
- Standardize all forms on the `useActionState` + `ActionResult<T>` pattern
- Add client-side Zod validation for instant feedback before server round-trips
- Set `aria-invalid` and `aria-describedby` on errored inputs automatically
- Suppress HTML5 native validation in favor of custom inline error display
- Migrate all 4 auth forms from redirect-on-error to structured error flow

### What this RFC is NOT

- A form library replacement (no `react-hook-form`, no `formik`)
- A multi-step wizard system
- Real-time async field validation (debounced uniqueness checks, etc.)

---

## 2. Technical Objective

Design a form validation layer that:

1. Uses `useActionState` + `ActionResult<T>` as the **single error propagation pattern** for all forms
2. Provides shared components that handle error display, `aria-invalid`, and `aria-describedby` automatically
3. Supports **dual validation**: client-side Zod for instant feedback + server-side Zod as authoritative source
4. Works with existing `@enterprise/ui` primitives (Input, Textarea, Select) without modifying them
5. Is fully documented in a `form-validation` agent skill

---

## 3. Architecture

### Error Flow

```text
User submits form
    │
    ▼
Client-side Zod validation (optional, instant)
    │  schema.safeParse(formData) → fieldErrors
    │  if errors → display inline, do NOT submit
    │
    ▼ (no client errors)
Server Action receives FormData
    │
    ▼
Server-side Zod validation (authoritative)
    │  schema.safeParse(input) → flatten().fieldErrors
    │  if errors → return ActionResult { success: false, error: { details: fieldErrors } }
    │
    ▼ (no Zod errors)
Service layer executes business logic
    │  if failure → return ActionResult { success: false, error: { message: "..." } }
    │
    ▼ (success)
Return ActionResult { success: true, data: result }
    │
    ▼
useActionState receives new state
    │
    ▼
FormField reads state → displays field errors inline
Form reads state → displays form-level error banner or success
```

### Component Hierarchy

```text
<form action={formAction} noValidate>
    │
    ├── <FormBanner state={state} />              ← form-level error/success
    │
    ├── <FormField name="email" label="Email" state={state} required>
    │       ├── <Label htmlFor="email">Email *</Label>
    │       ├── <Input id="email" name="email" aria-invalid={true} aria-describedby="email-error" />
    │       └── <FormMessage id="email-error">Enter a valid email address</FormMessage>
    │
    ├── <FormField name="password" label="Password" state={state} required>
    │       ├── <Label htmlFor="password">Password *</Label>
    │       ├── <Input id="password" name="password" />
    │       └── (no error → no FormMessage rendered)
    │
    └── <SubmitButton>Sign in</SubmitButton>      ← uses useFormStatus for pending
```

### Package Ownership

```text
@enterprise/contracts
 ├── src/types/platform.ts        → ActionResult, ActionError (existing)
 ├── src/types/form.ts            → FieldErrors type, getFieldError utility
 └── src/index.ts                 → Re-exports new types

@enterprise/ui
 ├── src/components/form-field.tsx → FormField composition component (NEW)
 ├── src/components/form-message.tsx → FormMessage error text component (NEW)
 ├── src/components/form-banner.tsx  → FormBanner error/success banner (NEW)
 ├── src/components/submit-button.tsx → SubmitButton with useFormStatus (NEW)
 ├── src/components/input.tsx      → UNCHANGED (aria-invalid styles already exist)
 ├── src/components/textarea.tsx   → UNCHANGED (aria-invalid styles already exist)
 ├── src/components/select.tsx     → UNCHANGED (aria-invalid styles already exist)
 └── src/hooks/use-form-validation.ts → Client-side Zod validation hook (NEW)

@enterprise/web (ui/)
 ├── features/auth/components/     → Client Component wrappers for auth forms (NEW)
 ├── features/auth/actions.ts      → MODIFIED (return ActionResult instead of redirect on error)
 ├── features/resources/components/resource-form.tsx → MODIFIED (use shared FormField)
 └── app/(auth)/sign-in/page.tsx   → MODIFIED (use new client form component)
```

### Dependency Direction (respected)

```text
@enterprise/contracts → zod ONLY (defines FieldErrors type)
@enterprise/ui → @enterprise/contracts (imports FieldErrors, ActionResult for component props)
@enterprise/web → @enterprise/contracts, @enterprise/ui (uses components + types)
```

No new packages. No circular dependencies.

---

## 4. Contracts: Types and Utilities

### FieldErrors Type

New file: `packages/contracts/src/types/form.ts`

```typescript
/** Field-level validation errors from Zod flatten().fieldErrors */
export type FieldErrors = Record<string, string[]>;

/**
 * Extract the first error message for a given field from an ActionResult.
 *
 * @param result - The ActionResult from useActionState (can be null on initial render)
 * @param field - The field name to look up
 * @returns The first error message, or undefined if no error
 */
export function getFieldError<T>(
  result: ActionResult<T> | null,
  field: string,
): string | undefined {
  if (!result || result.success) return undefined;
  const details = result.error?.details as FieldErrors | undefined;
  return details?.[field]?.[0];
}

/**
 * Check if the ActionResult has any field-level errors (vs only a form-level error).
 */
export function hasFieldErrors<T>(result: ActionResult<T> | null): boolean {
  if (!result || result.success) return false;
  const details = result.error?.details as FieldErrors | undefined;
  return details !== undefined && Object.keys(details).length > 0;
}
```

### Updated ActionError Details Type

The existing `ActionError.details` typed as `Record<string, unknown>` is intentionally kept loose for extensibility. The `getFieldError` utility handles the cast internally. No breaking changes.

---

## 5. Shared Components

### FormField

New file: `packages/ui/src/components/form-field.tsx`

```tsx
import type { ActionResult } from "@enterprise/contracts";
import { getFieldError } from "@enterprise/contracts";
import { Label } from "@enterprise/ui/components/label";
import { FormMessage } from "@enterprise/ui/components/form-message";
import { cn } from "@enterprise/ui/lib/utils";
import {
  type ReactElement,
  type ReactNode,
  Children,
  cloneElement,
  isValidElement,
  useId,
} from "react";

interface FormFieldProps {
  /** Field name matching the input's name attribute and the Zod schema key */
  name: string;
  /** Label text */
  label: string;
  /** ActionResult from useActionState — reads field errors from here */
  state: ActionResult | null;
  /** Mark field as required (shows * indicator on label) */
  required?: boolean;
  /** Optional description text below the input */
  description?: string;
  /** Additional CSS classes on the wrapper */
  className?: string;
  /** The input element (Input, Textarea, Select, etc.) */
  children: ReactNode;
}

export function FormField({
  name,
  label,
  state,
  required = false,
  description,
  className,
  children,
}: FormFieldProps) {
  const autoId = useId();
  const fieldId = `${name}-${autoId}`;
  const errorId = `${fieldId}-error`;
  const descriptionId = description ? `${fieldId}-desc` : undefined;
  const error = getFieldError(state, name);
  const hasError = Boolean(error);

  // Clone the child input to inject aria attributes
  const enhancedChildren = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    return cloneElement(child as ReactElement<Record<string, unknown>>, {
      id: fieldId,
      name,
      "aria-invalid": hasError || undefined,
      "aria-describedby": [
        hasError ? errorId : undefined,
        descriptionId,
      ]
        .filter(Boolean)
        .join(" ") || undefined,
    });
  });

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={fieldId}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {enhancedChildren}
      {description && (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {hasError && <FormMessage id={errorId}>{error}</FormMessage>}
    </div>
  );
}
```

### FormMessage

New file: `packages/ui/src/components/form-message.tsx`

```tsx
import { cn } from "@enterprise/ui/lib/utils";
import type { ReactNode } from "react";

interface FormMessageProps {
  id?: string;
  children: ReactNode;
  className?: string;
}

export function FormMessage({ id, children, className }: FormMessageProps) {
  if (!children) return null;

  return (
    <p
      id={id}
      role="alert"
      className={cn("text-xs text-destructive", className)}
    >
      {children}
    </p>
  );
}
```

### FormBanner

New file: `packages/ui/src/components/form-banner.tsx`

```tsx
import type { ActionResult } from "@enterprise/contracts";
import { hasFieldErrors } from "@enterprise/contracts";
import { cn } from "@enterprise/ui/lib/utils";

interface FormBannerProps<T> {
  state: ActionResult<T> | null;
  /** Message shown on success. If undefined, no success banner is shown. */
  successMessage?: string;
  className?: string;
}

export function FormBanner<T>({
  state,
  successMessage,
  className,
}: FormBannerProps<T>) {
  if (!state) return null;

  // Success
  if (state.success && successMessage) {
    return (
      <p className={cn("rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-500", className)}>
        {successMessage}
      </p>
    );
  }

  // Error — but only show banner for form-level errors, not field-level
  if (!state.success && !hasFieldErrors(state)) {
    return (
      <p
        role="alert"
        className={cn(
          "rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive",
          className,
        )}
      >
        {state.error?.message ?? "An error occurred. Please try again."}
      </p>
    );
  }

  return null;
}
```

### SubmitButton

New file: `packages/ui/src/components/submit-button.tsx`

```tsx
"use client";

import { Button } from "@enterprise/ui/components/button";
import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

interface SubmitButtonProps extends Omit<ComponentProps<typeof Button>, "type" | "disabled"> {
  /** Text shown while form is submitting */
  pendingText?: string;
}

export function SubmitButton({
  children,
  pendingText = "Saving…",
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? pendingText : children}
    </Button>
  );
}
```

---

## 6. Client-Side Validation Hook

New file: `packages/ui/src/hooks/use-form-validation.ts`

```typescript
"use client";

import type { ActionResult } from "@enterprise/contracts";
import type { ZodSchema } from "zod";
import { useCallback, useRef } from "react";

interface UseFormValidationOptions<T> {
  /** Zod schema to validate against (same schema used server-side) */
  schema: ZodSchema;
  /** The server action wrapped by useActionState */
  serverAction: (
    prevState: ActionResult<T> | null,
    formData: FormData,
  ) => Promise<ActionResult<T>>;
}

/**
 * Wraps a server action with client-side Zod validation.
 * Returns a new action function that validates client-side first,
 * returning field errors immediately without a server round-trip.
 *
 * Usage:
 *   const validatedAction = useFormValidation({ schema: loginDto, serverAction: signInAction });
 *   const [state, formAction, isPending] = useActionState(validatedAction, null);
 */
export function useFormValidation<T>({
  schema,
  serverAction,
}: UseFormValidationOptions<T>) {
  const serverActionRef = useRef(serverAction);
  serverActionRef.current = serverAction;

  return useCallback(
    async (
      prevState: ActionResult<T> | null,
      formData: FormData,
    ): Promise<ActionResult<T>> => {
      // Convert FormData to plain object for Zod validation
      const rawData: Record<string, unknown> = {};
      for (const [key, value] of formData.entries()) {
        rawData[key] = value;
      }

      const result = schema.safeParse(rawData);

      if (!result.success) {
        const fieldErrors = result.error.flatten().fieldErrors;
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Please fix the errors below.",
            details: fieldErrors as Record<string, unknown>,
          },
        } as ActionResult<T>;
      }

      // Client validation passed — proceed to server
      return serverActionRef.current(prevState, formData);
    },
    [schema],
  );
}
```

---

## 7. Auth Form Migration

### Current Pattern (redirect-on-error)

```typescript
// ❌ Current: ui/features/auth/actions.ts
export async function signInAction(formData: FormData) {
  const raw = { email: formData.get("email"), password: formData.get("password") };
  const parsed = loginDto.safeParse(raw);
  if (!parsed.success) {
    redirect("/sign-in"); // Silent — no error feedback
  }
  const result = await signIn(client, parsed.data);
  if (result.error) {
    redirect("/sign-in"); // Silent — no error feedback
  }
  redirect("/dashboard");
}
```

### New Pattern (ActionResult-based)

```typescript
// ✅ New: ui/features/auth/actions.ts
export async function signInAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const raw = { email: formData.get("email"), password: formData.get("password") };
  const parsed = loginDto.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Please fix the errors below.",
        details: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const client = await createAuthClient();
  const result = await signIn(client, parsed.data);

  if (result.error) {
    return {
      success: false,
      error: {
        code: "AUTH_ERROR",
        message: "Invalid email or password.",
      },
    };
  }

  redirect("/dashboard");
}
```

### Auth Form Component Migration

Auth pages are currently Server Components with inline `<form>` elements. Since `useActionState` requires a Client Component, we create thin Client Component wrappers:

```text
ui/features/auth/components/
 ├── sign-in-form.tsx    ← "use client", uses useActionState
 ├── sign-up-form.tsx    ← "use client", uses useActionState
 ├── forgot-password-form.tsx
 └── reset-password-form.tsx
```

The page files (`ui/app/(auth)/sign-in/page.tsx`, etc.) remain Server Components that render the layout and import the form component.

### Example: Sign-In Form Component

```tsx
// ✅ New: ui/features/auth/components/sign-in-form.tsx
"use client";

import type { ActionResult } from "@enterprise/contracts";
import { loginDto } from "@enterprise/contracts";
import { Input } from "@enterprise/ui/components/input";
import { FormField } from "@enterprise/ui/components/form-field";
import { FormBanner } from "@enterprise/ui/components/form-banner";
import { SubmitButton } from "@enterprise/ui/components/submit-button";
import { useFormValidation } from "@enterprise/ui/hooks/use-form-validation";
import { useActionState } from "react";
import { signInAction } from "@/features/auth/actions";

export function SignInForm() {
  const validatedAction = useFormValidation({
    schema: loginDto,
    serverAction: signInAction,
  });
  const [state, formAction] = useActionState(validatedAction, null);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <FormBanner state={state} />

      <FormField name="email" label="Email" state={state} required>
        <Input type="email" placeholder="you@example.com" />
      </FormField>

      <FormField name="password" label="Password" state={state} required>
        <Input type="password" placeholder="Your password" />
      </FormField>

      <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
    </form>
  );
}
```

Compare this with the current 80+ lines of form markup + error URL param parsing. The new version is ~25 lines with full inline validation, server error display, pending state, and accessibility.

---

## 8. Migrated Resource Form (Before/After)

### Before (current)

```tsx
// ❌ Current: Manual getFieldError, no aria-invalid, no shared components
<div className="flex flex-col gap-1.5 sm:col-span-2">
  <Label htmlFor="title">
    Title <span className="text-destructive">*</span>
  </Label>
  <Input id="title" name="title" required defaultValue={defaultValues?.title ?? ""} />
  {getFieldError(state, "title") && (
    <p className="text-xs text-destructive">{getFieldError(state, "title")}</p>
  )}
</div>
```

### After (migrated)

```tsx
// ✅ New: Shared FormField handles everything
<FormField name="title" label="Title" state={state} required className="sm:col-span-2">
  <Input defaultValue={defaultValues?.title ?? ""} placeholder="Resource title" />
</FormField>
```

The `FormField` component handles:
- Label rendering with required indicator
- `id` generation and `htmlFor` binding
- `aria-invalid` on the input when error exists
- `aria-describedby` linking input to error message
- Error message rendering below the input

---

## 9. Validation Behavior Specification

### When Validation Runs

| Trigger | What Happens |
|---------|-------------|
| Form submit (with `useFormValidation`) | Client-side Zod validates first. If errors, they show inline without server call. |
| Form submit (server-side) | Server Action runs Zod `safeParse`. If errors, returns `ActionResult` with field errors. |
| User edits an errored field | Error stays visible until next form submission (no real-time clearing in V1). |
| Server business logic fails | Form-level error banner shows the server message. |

### Error Priority

```
Is it a field-level error (from Zod)?
├── Yes → Show inline below the specific field, set aria-invalid
│         If MULTIPLE fields have errors → show ALL of them simultaneously
└── No
    └── Is it a form-level error (from service/auth)?
        └── Yes → Show in FormBanner at top of form
```

### HTML5 Validation Suppression

All forms use `noValidate` attribute:

```tsx
<form action={formAction} noValidate>
```

This prevents browser-native validation popups. Custom validation (via Zod) provides the same rules with better UX (inline messages, consistent styling, accessible markup).

---

## 10. Technical Decisions

| Decision | Rationale |
|----------|-----------|
| No `react-hook-form` | The project already uses native `<form>` + `useActionState`. Adding RHF would introduce a second form paradigm and a new dependency. The current pattern works well with shared components. |
| `noValidate` on all forms | Prevents inconsistent browser popups. Custom validation provides the same rules with better UX. |
| `useFormValidation` hook for client-side | Reuses the same Zod schema used server-side. Single source of truth for validation rules. |
| `FormField` uses `cloneElement` | Injects `aria-invalid` and `aria-describedby` without requiring the input to know about form state. Keeps Input/Textarea/Select unchanged. |
| Error stays until re-submit (V1) | Simpler implementation. Real-time clearing requires `onChange` handlers and client state, which adds complexity. Can be added in V2. |
| Auth actions return `ActionResult` instead of `redirect` on error | Enables structured error display. `redirect` on success is preserved. |
| `role="alert"` on FormMessage | Screen readers announce new error messages when they appear. |

---

## 11. Trade-offs

### Prioritized

- **Simplicity**: Shared components, no new form library
- **Consistency**: Same pattern and components across all forms
- **Accessibility**: `aria-invalid`, `aria-describedby`, `role="alert"` on errors
- **Progressive enhancement**: Forms still work without JS (server validation + redirect fallback)

### Sacrificed

- Real-time field clearing on edit (deferred to V2 — requires onChange handlers)
- Async validation (e.g., check email uniqueness while typing — deferred)
- `react-hook-form` integration (project uses native forms, no reason to add RHF)
- Password strength meter (UI enhancement, not core validation)

---

## 12. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Auth pages must have Client Component children | Minor — the page layout stays Server Component, only the form is Client Component | Create thin `SignInForm` wrappers, page passes no sensitive data |
| `cloneElement` is fragile with wrapper components | `FormField` assumes direct child is the input | Document in skill that the input must be the direct child of `FormField` |
| Client-side Zod validation increases bundle | Zod schemas are already imported for types | Schemas are small; measure impact and tree-shake if needed |
| Changing auth actions breaks OAuth callback flows | OAuth flows (`/auth/callback`) use different code paths | Only modify email/password auth actions, OAuth is untouched |
| Double validation (client + server) feels redundant | Server validation is always authoritative | Client validation is for UX speed only, server always re-validates |

---

## 13. Implementation Plan

### Phase 1 — Contracts + Shared Components (no visual changes)

1. Create `packages/contracts/src/types/form.ts` — `FieldErrors`, `getFieldError`, `hasFieldErrors`
2. Export from contracts barrel
3. Create `packages/ui/src/components/form-field.tsx`
4. Create `packages/ui/src/components/form-message.tsx`
5. Create `packages/ui/src/components/form-banner.tsx`
6. Create `packages/ui/src/components/submit-button.tsx`
7. Create `packages/ui/src/hooks/use-form-validation.ts`
8. Export all from ui barrel
9. Unit tests for `getFieldError`, `hasFieldErrors`, `useFormValidation`

**Tests**: Utilities return correct values for various `ActionResult` shapes. Components render error states correctly.

### Phase 2 — Auth Form Migration

1. Modify `ui/features/auth/actions.ts` — all 4 actions return `ActionResult` on error
2. Create `ui/features/auth/components/sign-in-form.tsx` using `FormField` + `useActionState`
3. Create `ui/features/auth/components/sign-up-form.tsx`
4. Create `ui/features/auth/components/forgot-password-form.tsx`
5. Create `ui/features/auth/components/reset-password-form.tsx`
6. Update page files to import new form components
7. Add client-side Zod validation via `useFormValidation` on each form
8. E2E tests: sign-in with invalid credentials shows error, sign-up with short password shows field error

**Tests**: E2E tests for every auth form validation scenario. Unit tests for action error returns.

### Phase 3 — Resource Form Migration

1. Refactor `resource-form.tsx` to use shared `FormField` instead of manual error display
2. Remove local `getFieldError` function (use imported utility)
3. Add `noValidate` to form
4. Add client-side Zod validation
5. Verify `aria-invalid` activates destructive styles on Input/Textarea

**Tests**: E2E tests for resource form validation. Visual regression check.

### Phase 4 — Skill + Documentation

1. Create `form-validation` agent skill
2. Update `ui/AGENTS.md` to replace `react-hook-form` references with actual pattern
3. Add auto-invoke entries for the new skill

---

## 14. Acceptance Criteria

1. All 6 forms display inline field-level errors below the errored input
2. All errored inputs show `border-destructive` via `aria-invalid` CSS
3. The sign-in form displays "Invalid email or password" on credential failure
4. The reset-password form displays "Passwords do not match" on mismatch
5. All forms use `noValidate` — no HTML5 browser popups
6. All forms have pending state on the submit button
7. `FormField`, `FormMessage`, `FormBanner`, `SubmitButton` exist in `@enterprise/ui`
8. `getFieldError` and `FieldErrors` are exported from `@enterprise/contracts`
9. Client-side Zod validation fires before server submission on all forms
10. Screen readers announce error messages via `role="alert"` and `aria-describedby`
11. `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm e2e` pass
12. `form-validation` skill exists and is referenced in AGENTS.md auto-invoke table

---

## 15. File Inventory

### New Files

| File | Package | Purpose |
|------|---------|---------|
| `src/types/form.ts` | contracts | FieldErrors type, getFieldError, hasFieldErrors |
| `src/components/form-field.tsx` | ui | FormField composition component |
| `src/components/form-message.tsx` | ui | Error message component |
| `src/components/form-banner.tsx` | ui | Form-level error/success banner |
| `src/components/submit-button.tsx` | ui | Submit button with pending state |
| `src/hooks/use-form-validation.ts` | ui | Client-side Zod validation hook |
| `features/auth/components/sign-in-form.tsx` | web | Sign-in form (Client Component) |
| `features/auth/components/sign-up-form.tsx` | web | Sign-up form (Client Component) |
| `features/auth/components/forgot-password-form.tsx` | web | Forgot password form |
| `features/auth/components/reset-password-form.tsx` | web | Reset password form |
| `skills/form-validation/SKILL.md` | skills | Agent skill for form validation patterns |

### Modified Files

| File | Change |
|------|--------|
| `packages/contracts/src/index.ts` | Export FieldErrors, getFieldError, hasFieldErrors |
| `packages/ui/src/index.ts` | Export FormField, FormMessage, FormBanner, SubmitButton, useFormValidation |
| `ui/features/auth/actions.ts` | Return ActionResult on error instead of redirect |
| `ui/features/resources/components/resource-form.tsx` | Use shared FormField, remove local getFieldError |
| `ui/app/(auth)/sign-in/page.tsx` | Import SignInForm component |
| `ui/app/(auth)/sign-up/page.tsx` | Import SignUpForm component |
| `ui/app/(auth)/forgot-password/page.tsx` | Import ForgotPasswordForm component |
| `ui/app/(auth)/reset-password/page.tsx` | Import ResetPasswordForm component |
| `ui/AGENTS.md` | Replace react-hook-form references, add form-validation skill |
| `AGENTS.md` | Add form-validation to auto-invoke table |

### Deleted Files

None. The current auth form markup is replaced by imported components. The local `getFieldError` in resource-form.tsx is removed (replaced by import from contracts).

---

## 16. In One Sentence

> A shared form validation system using `useActionState` + `ActionResult<T>` with reusable `FormField`/`FormMessage` components, client-side Zod pre-validation, and accessible error states — standardizing all forms from auth to CRUD with inline field errors and server error propagation.
