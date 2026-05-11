"use client";

import type { ActionResult } from "@enterprise/contracts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@enterprise/ui/components/card";
import { FormBanner } from "@enterprise/ui/components/form-banner";
import { FormMessage } from "@enterprise/ui/components/form-message";
import { Label } from "@enterprise/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@enterprise/ui/components/select";
import { SubmitButton } from "@enterprise/ui/components/submit-button";
import { useActionState } from "react";
import { updateWorkspaceRegionalAction } from "@/features/workspace-admin/actions";
import type { WorkspaceSettings } from "@/features/workspace-admin/types";

interface RegionalFormProps {
  settings: WorkspaceSettings;
}

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Buenos_Aires",
  "America/Sao_Paulo",
  "America/Mexico_City",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Amsterdam",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Australia/Sydney",
  "Pacific/Auckland",
] as const;

const LOCALES = [
  { value: "en-US", label: "English (United States)" },
  { value: "en-GB", label: "English (United Kingdom)" },
  { value: "es-AR", label: "Spanish (Argentina)" },
  { value: "es-ES", label: "Spanish (Spain)" },
  { value: "pt-BR", label: "Portuguese (Brazil)" },
  { value: "pt-PT", label: "Portuguese (Portugal)" },
  { value: "fr-FR", label: "French (France)" },
  { value: "de-DE", label: "German (Germany)" },
  { value: "it-IT", label: "Italian (Italy)" },
  { value: "ja-JP", label: "Japanese (Japan)" },
  { value: "zh-CN", label: "Chinese (Simplified)" },
  { value: "ko-KR", label: "Korean (South Korea)" },
] as const;

export function RegionalForm({ settings }: RegionalFormProps) {
  const [state, formAction] = useActionState(
    async (
      _prev: ActionResult<{ timezone: string; locale: string }> | null,
      formData: FormData,
    ): Promise<ActionResult<{ timezone: string; locale: string }>> => {
      return updateWorkspaceRegionalAction({
        timezone: formData.get("timezone") ?? undefined,
        locale: formData.get("locale") ?? undefined,
      });
    },
    null,
  );

  const timezoneError =
    state && !state.success && state.error?.details
      ? (state.error.details as Record<string, string[]>)["timezone"]?.[0]
      : undefined;

  const localeError =
    state && !state.success && state.error?.details
      ? (state.error.details as Record<string, string[]>)["locale"]?.[0]
      : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Regional Settings</CardTitle>
        <CardDescription>Configure timezone and locale for your workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} noValidate className="flex flex-col gap-4">
          <FormBanner state={state} successMessage="Regional settings updated." />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="timezone">
              Timezone <span className="text-destructive">*</span>
            </Label>
            <Select name="timezone" defaultValue={settings.timezone}>
              <SelectTrigger
                id="timezone"
                aria-invalid={timezoneError ? true : undefined}
                aria-describedby={timezoneError ? "timezone-error" : undefined}
                data-testid="timezone-select"
              >
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {timezoneError && <FormMessage id="timezone-error">{timezoneError}</FormMessage>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="locale">
              Locale <span className="text-destructive">*</span>
            </Label>
            <Select name="locale" defaultValue={settings.locale}>
              <SelectTrigger
                id="locale"
                aria-invalid={localeError ? true : undefined}
                aria-describedby={localeError ? "locale-error" : undefined}
                data-testid="locale-select"
              >
                <SelectValue placeholder="Select locale" />
              </SelectTrigger>
              <SelectContent>
                {LOCALES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {localeError && <FormMessage id="locale-error">{localeError}</FormMessage>}
          </div>

          <div className="flex justify-end">
            <SubmitButton data-testid="save-regional-button">Save regional changes</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
