# PRD — Form Validation UX System

## 1. Context

The Enterprise Platform has 6 forms across auth flows (sign-in, sign-up, forgot-password, reset-password) and resource management (create/edit resource, delete confirmation). These forms currently rely on a mix of HTML5 native validation and redirect-based error patterns that provide poor or zero feedback to users when something goes wrong.

The resource form (`resource-form.tsx`) is the only form using `useActionState` with structured `ActionResult<T>` errors and inline field messages. The 4 auth forms use Server Components with `redirect()` on validation failure, which means the user sees a page reload with no indication of what went wrong. In the worst case (sign-in with invalid credentials), the user gets **zero feedback** — the page silently reloads.

---

## 2. Problem

The core problem is **inconsistent and incomplete validation feedback** across all forms.

Today:

- The sign-in form silently redirects on invalid credentials — no error message at all
- The sign-up form shows a generic "check your inputs" banner but never tells the user *which* input failed
- The reset-password form has a Zod `.refine()` that produces "Passwords do not match", but the message is thrown away and replaced with a misleading "Request a new link" banner
- HTML5 native validation (browser popups) is the only client-side validation — visually inconsistent across browsers and unhelpful for complex rules
- The `Input` and `Textarea` components have built-in `aria-invalid` destructive styles, but no form ever sets `aria-invalid` — these styles are completely wasted
- There are no shared form composition components (`FormField`, `FormMessage`, etc.)
- There are two completely different error patterns (redirect-based vs `ActionResult`-based) with no architectural consistency
- No form has client-side Zod validation — every validation requires a server round-trip

This directly impacts:

- **User trust**: Silent failures make users think the system is broken
- **Conversion**: Users abandon auth flows when they cannot figure out what went wrong
- **Accessibility**: No `aria-invalid` means screen readers cannot identify errored fields
- **Developer velocity**: Each new form re-invents its own error display pattern
- **Consistency**: Two different error architectures make the codebase harder to maintain

---

## 3. Objective

Build a unified form validation UX system that enables:

- Immediate, inline field-level error feedback on every form
- Consistent error display using shared components and patterns
- Server error propagation to the UI (auth failures, business rule violations)
- Accessible error states using `aria-invalid` and `aria-describedby`
- Client-side Zod validation for instant feedback before server round-trips
- A documented, reusable pattern that any developer can follow for new forms

---

## 4. Value Proposition

**Every form gives clear, specific, accessible feedback** — field-level errors appear inline, server errors show contextual messages, and the user always knows what to fix.

---

## 5. Users

| Role | Impact |
|------|--------|
| **End user** | Gets clear, immediate feedback on form errors — knows exactly what to fix |
| **Developer** | Uses shared components and a documented pattern to build validated forms in minutes |
| **QA** | Tests against a consistent validation behavior contract |

> **Primary user: End user** — experiences the validation feedback directly.

---

## 6. Scope

### Included

- Shared `FormField` component (Label + Input slot + error message + `aria-invalid`)
- Shared `FormMessage` component (renders field-level or form-level error text)
- `getFieldError` typed utility extracted to `@enterprise/contracts`
- `FieldErrors` type definition in `@enterprise/contracts`
- Migration of all 4 auth forms to `useActionState` with `ActionResult<T>` error flow
- Fix sign-in action to surface credential errors
- Fix reset-password to surface "passwords don't match" error
- `aria-invalid` integration on all form inputs with errors
- `useFormStatus`-based pending state on all submit buttons
- Client-side Zod validation layer (optional instant feedback before server submission)
- Suppress HTML5 native validation popups (`noValidate` on forms, custom display)
- New `form-validation` agent skill documenting the canonical pattern

### Not included

- Multi-step form wizards
- Drag-and-drop or file upload validation
- Real-time async validation (e.g., check email uniqueness while typing)
- Form state persistence across page navigations
- Visual form builder

---

## 7. User Journey

### Form Submission with Errors

1. User fills in a form (e.g., sign-in with email and password)
2. User clicks Submit
3. **Client-side validation fires first** — if email format is wrong, the input immediately shows a red border and "Enter a valid email address" below the field
4. If client-side passes, form submits to the Server Action
5. **Server validation fires** — Zod `safeParse` runs, returns field errors via `ActionResult`
6. If Zod fails, each errored field shows its specific message inline (e.g., "Password must be at least 8 characters")
7. If Zod passes but the operation fails (e.g., invalid credentials), a **form-level error banner** appears with the server message
8. User fixes the highlighted fields and resubmits
9. On success, the form either navigates (auth) or shows a success message (CRUD)

### Accessible Flow

1. Screen reader announces `aria-invalid` state change on errored inputs
2. Error messages are linked via `aria-describedby` to their input
3. Focus moves to the first errored field after submission failure

---

## 8. Core Features

### 8.1 Shared FormField Component

- Composes `Label` + input slot + error message in a consistent layout
- Automatically sets `aria-invalid` and `aria-describedby` when an error is present
- Shows required indicator on label when field is required
- Supports all input types (Input, Textarea, Select)

### 8.2 Inline Field Error Display

- Error text appears below the input in `text-destructive` color
- Input border changes to `border-destructive` via `aria-invalid` CSS (already exists in components)
- Error ring appears on focus in `ring-destructive` (already exists in components)
- Error text clears when the user starts editing the field

### 8.3 Form-Level Error Banner

- Displays when the server returns a general error (not tied to a specific field)
- Examples: "Invalid credentials", "Account already exists", "Service unavailable"
- Styled as a destructive alert with icon
- Positioned at the top of the form

### 8.4 Client-Side Validation

- Uses the same Zod schema from `@enterprise/contracts` to validate before submission
- Provides instant feedback without server round-trip
- Does NOT replace server-side validation (server is always authoritative)
- Triggered on form submit (not on every keystroke by default)

### 8.5 Pending State

- Submit button shows loading state and is disabled during submission
- Uses `useFormStatus` or `isPending` from `useActionState`
- Prevents double-submission

### 8.6 Success Feedback

- Mutations show a success message or navigate to the appropriate page
- Auth forms redirect after success (existing behavior, preserved)

---

## 9. Non-Functional Requirements

- **Accessible** — `aria-invalid`, `aria-describedby`, focus management on error
- **Consistent** — Same visual pattern and behavior across all forms
- **Performant** — Client-side validation is synchronous, no extra network calls
- **Progressive** — Forms work without JavaScript (server validation + redirect as fallback)
- **Reusable** — Shared components reduce per-form boilerplate to near zero
- **Documented** — Agent skill ensures AI assistants follow the pattern correctly

---

## 10. Success Metrics

### Product

- Zero silent form failures (every submission error produces visible user feedback)
- All 6 forms display field-level errors inline
- Reduction in support tickets related to "login not working"

### Technical

- Shared `FormField` component used in 100% of forms
- `aria-invalid` set on every errored input
- Single validation pattern (`useActionState` + `ActionResult`) across all forms
- `form-validation` skill followed for all new form development
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm e2e` all pass

---

## 11. Risks

| Risk | Mitigation |
|------|------------|
| Auth forms must become Client Components | Use thin Client Component wrappers for the form only; the page layout remains Server Component |
| Client-side Zod schemas increase bundle size | Use dynamic imports or validate only on submit, not on every keystroke |
| Changing auth error flow may break redirect behavior | Preserve redirect on success; only change error flow |
| Too many simultaneous form changes | Implement in phases — shared components first, then migrate forms one by one |

---

## 12. Definition of Success

The system will be successful if:

- **Every form error produces visible, specific feedback** — never a silent reload
- Users can **identify and fix validation errors without guessing**
- Developers can **build a new validated form in under 30 minutes** using shared components
- The pattern is **documented in a skill** that AI agents follow automatically
- All forms pass **accessibility audit** for form validation (WCAG 2.1 Level AA)

---

## 13. Implementation Phases

### Phase 1 — Shared Components + Utilities

- Create `FormField`, `FormMessage` in `@enterprise/ui`
- Extract `getFieldError` and `FieldErrors` type to `@enterprise/contracts`
- Unit tests for utilities

### Phase 2 — Auth Form Migration

- Convert auth forms to use `useActionState` + `ActionResult` error flow
- Fix sign-in action to return credential errors
- Fix reset-password to surface "passwords don't match"
- Add `noValidate` + client-side Zod validation
- Add pending state to all auth submit buttons
- E2E tests for auth validation flows

### Phase 3 — Resource Form Upgrade

- Migrate resource form to use shared `FormField` component
- Add `aria-invalid` to all fields
- Add client-side Zod validation
- E2E tests for resource validation flows

### Phase 4 — Skill + Documentation

- Create `form-validation` skill with canonical patterns
- Update `ui/AGENTS.md` to replace incorrect `react-hook-form` references
- Architecture documentation in `docs/architecture/`

---

## 14. In One Sentence

> A unified form validation UX system that provides inline field errors, server error propagation, and accessible error states across all forms — with shared components, a documented pattern, and an agent skill to enforce consistency.
