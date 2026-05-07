---
name: form-validation
description: >
  Form validation patterns for the Enterprise Platform — useActionState + ActionResult<T> + Zod,
  shared FormField/FormMessage components, client-side pre-validation, server error propagation,
  and accessible error states (aria-invalid, aria-describedby).
  Trigger: When building forms, adding validation, handling form errors, using useActionState,
  working with ActionResult, or creating Server Actions that return validation errors.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
  scope:
    - "ui/features/**/components/*form*"
    - "ui/features/**/actions.ts"
    - "packages/ui/src/components/form-*"
    - "packages/ui/src/hooks/use-form-*"
    - "packages/contracts/src/types/form.ts"
  auto_invoke:
    - action: "Building forms with validation"
    - action: "Creating Server Actions that validate input"
    - action: "Handling form errors in UI"
    - action: "Using useActionState"
    - action: "Displaying inline validation errors"
    - action: "Working with ActionResult error details"
---

## When to Use

- Building ANY form in the Enterprise Platform (auth, CRUD, settings, etc.)
- Creating a Server Action that validates input with Zod
- Displaying validation errors inline below form fields
- Displaying server errors (auth failure, business rule violation) as form banners
- Adding pending/loading state to form submit buttons
- Adding client-side Zod validation before server submission

## Critical Rules

- **NEVER use redirect() for validation errors.** Return `ActionResult` with field errors instead.
- **NEVER use react-hook-form.** The project uses native `<form>` + `useActionState`.
- **ALWAYS use `noValidate` on `<form>`.** Suppress HTML5 browser popups — use custom validation.
- **ALWAYS use `FormField`** from `@enterprise/ui` to wrap inputs. It handles Label, aria-invalid, aria-describedby, and error display automatically.
- **ALWAYS return `ActionResult<T>`** from Server Actions — never throw, never redirect on error.
- **ALWAYS set `aria-invalid`** on errored inputs. `FormField` does this automatically.
- **ALWAYS use `SubmitButton`** from `@enterprise/ui` for form submission. It disables during pending state via `useFormStatus`.
- **Server-side Zod validation is ALWAYS authoritative.** Client-side is for UX speed only.

---

## Architecture: Error Flow

```text
User submits form
    │
    ▼
Client-side Zod validation (via useFormValidation hook)
    │  if errors → show inline, do NOT submit to server
    │
    ▼ (no client errors)
Server Action: Zod safeParse
    │  if errors → return ActionResult { error: { details: fieldErrors } }
    │
    ▼ (no Zod errors)
Service layer: business logic
    │  if failure → return ActionResult { error: { message: "..." } }
    │
    ▼
useActionState receives new state → FormField reads errors → inline display
```

---

## Canonical Form Pattern

```tsx
// ✅ Correct — Full form with validation
"use client";

import type { ActionResult } from "@enterprise/contracts";
import { myFormSchema } from "@enterprise/contracts";
import { Input } from "@enterprise/ui/components/input";
import { Textarea } from "@enterprise/ui/components/textarea";
import { FormField } from "@enterprise/ui/components/form-field";
import { FormBanner } from "@enterprise/ui/components/form-banner";
import { SubmitButton } from "@enterprise/ui/components/submit-button";
import { useFormValidation } from "@enterprise/ui/hooks/use-form-validation";
import { useActionState } from "react";
import { myServerAction } from "@/features/my-feature/actions";

export function MyForm() {
  const validatedAction = useFormValidation({
    schema: myFormSchema,
    serverAction: myServerAction,
  });
  const [state, formAction] = useActionState(validatedAction, null);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <FormBanner state={state} successMessage="Saved successfully." />

      <FormField name="title" label="Title" state={state} required>
        <Input placeholder="Enter title" />
      </FormField>

      <FormField name="description" label="Description" state={state}>
        <Textarea placeholder="Enter description" rows={4} />
      </FormField>

      <SubmitButton pendingText="Saving…">Save</SubmitButton>
    </form>
  );
}
```

```tsx
// ❌ Wrong — Manual error handling, no FormField, no noValidate
<form action={formAction}>
  <Label htmlFor="title">Title</Label>
  <Input id="title" name="title" required />
  {state?.error?.details?.title && (
    <p className="text-xs text-destructive">{state.error.details.title[0]}</p>
  )}
  <Button type="submit">Save</Button>
</form>
```

---

## Server Action Pattern

```typescript
// ✅ Correct — Returns ActionResult with field errors
"use server";

import type { ActionResult } from "@enterprise/contracts";
import { myFormSchema } from "@enterprise/contracts";

export async function myServerAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult<MyEntity>> {
  const raw = {
    title: formData.get("title"),
    description: formData.get("description"),
  };

  const parsed = myFormSchema.safeParse(raw);
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
  const result = await myService(client, parsed.data);

  if (!result.success) {
    return {
      success: false,
      error: {
        code: result.error.code,
        message: result.error.message,
      },
    };
  }

  revalidatePath("/my-feature");
  return { success: true, data: result.data };
}
```

```typescript
// ❌ Wrong — Redirects on validation error (loses error info)
export async function myServerAction(formData: FormData) {
  const parsed = myFormSchema.safeParse(raw);
  if (!parsed.success) {
    redirect("/my-feature?error=validation"); // User gets no field-level feedback
  }
}
```

---

## Shared Components Reference

### FormField

Wraps Label + input + error message. Handles `aria-invalid` and `aria-describedby` automatically.

```tsx
<FormField
  name="email"           // Must match Zod schema key and input name
  label="Email address"  // Label text
  state={state}          // ActionResult from useActionState
  required               // Shows * on label
  description="We'll never share your email." // Optional help text
  className="sm:col-span-2" // Additional wrapper classes
>
  <Input type="email" placeholder="you@example.com" />
</FormField>
```

**Rules:**
- The input MUST be the direct child of FormField (it uses cloneElement)
- `name` MUST match the Zod schema field name
- Do NOT set `id`, `aria-invalid`, or `aria-describedby` on the input — FormField handles them

### FormBanner

Displays form-level error or success message at the top of the form.

```tsx
<FormBanner
  state={state}
  successMessage="Resource created."  // Optional — omit for no success banner
/>
```

Shows error banner ONLY for form-level errors (no `details`). Does NOT show for field-level errors.

### FormMessage

Low-level error text component. Use `FormField` instead — it wraps `FormMessage` internally.

```tsx
<FormMessage id="email-error">Enter a valid email address</FormMessage>
```

### SubmitButton

Submit button with automatic pending state via `useFormStatus`.

```tsx
<SubmitButton pendingText="Creating…">Create Resource</SubmitButton>
```

---

## Error Types Decision Tree

```
Is the error from Zod safeParse?
├── Yes → Return as details: flatten().fieldErrors
│         FormField shows errors inline below each field
│         FormBanner does NOT show (has details = field-level)
└── No
    ├── Is it a service/business error?
    │   └── Yes → Return as error: { code, message } (no details)
    │             FormBanner shows the message
    │             Example: "Invalid email or password"
    └── Is it an unexpected error?
        └── Yes → Return as error: { code: "INTERNAL_ERROR", message: "..." }
              Log with Sentry, show generic message to user
```

---

## Client-Side Validation

Use `useFormValidation` hook to add instant client-side validation:

```tsx
const validatedAction = useFormValidation({
  schema: myFormSchema,     // Same Zod schema used server-side
  serverAction: myAction,   // The actual server action
});
const [state, formAction] = useActionState(validatedAction, null);
```

**How it works:**
1. On submit, Zod validates the FormData client-side first
2. If errors → returns `ActionResult` with field errors immediately (no server call)
3. If valid → calls the real server action
4. Server re-validates (always authoritative)

**When to skip client-side validation:**
- Forms where all fields are optional (no meaningful client validation)
- Forms with complex cross-field validation that only the server can check

---

## Accessibility Checklist

- [x] `noValidate` on `<form>` — suppresses browser popups
- [x] `aria-invalid` on errored inputs — triggers destructive border/ring styles
- [x] `aria-describedby` links input to error message
- [x] `role="alert"` on FormMessage — screen reader announces new errors
- [x] Required fields have `*` indicator on label
- [x] Submit button disabled during pending state — prevents double submit

---

## Common Patterns

### Edit Form with Default Values

```tsx
<FormField name="title" label="Title" state={state} required>
  <Input defaultValue={existingResource.title} />
</FormField>
```

### Select Field

```tsx
<FormField name="status" label="Status" state={state} required>
  <Select name="status" defaultValue="active">
    <SelectTrigger>
      <SelectValue placeholder="Select status" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="active">Active</SelectItem>
      <SelectItem value="draft">Draft</SelectItem>
    </SelectContent>
  </Select>
</FormField>
```

### Password Confirmation (refine)

```typescript
// In contracts schema
export const updatePasswordSchema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"], // Error shows on confirmPassword field
  });
```

### Auth Form (redirect on success only)

```typescript
// Server Action for auth — redirect ONLY on success
export async function signInAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  // ... validation and auth logic ...
  if (authError) {
    return {
      success: false,
      error: { code: "AUTH_ERROR", message: "Invalid email or password." },
    };
  }
  redirect("/dashboard"); // Only redirect on success
}
```

---

## File Locations

| What | Where |
|------|-------|
| Zod schemas | `packages/contracts/src/dto/` or `packages/contracts/src/schemas/` |
| ActionResult type | `packages/contracts/src/types/platform.ts` |
| FieldErrors + getFieldError | `packages/contracts/src/types/form.ts` |
| FormField, FormMessage, FormBanner | `packages/ui/src/components/form-*.tsx` |
| SubmitButton | `packages/ui/src/components/submit-button.tsx` |
| useFormValidation | `packages/ui/src/hooks/use-form-validation.ts` |
| Server Actions | `ui/features/{module}/actions.ts` |
| Form Components | `ui/features/{module}/components/*-form.tsx` |
