"use client";

import { Button } from "@enterprise/ui/components/button";
import { Separator } from "@enterprise/ui/components/separator";
import { Switch } from "@enterprise/ui/components/switch";
import { cn } from "@enterprise/ui/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { updatePreferencesAction } from "@/features/notifications/actions";
import type {
  NotificationCategory,
  NotificationPreferencesFormProps,
} from "@/features/notifications/types";

// Critical types that cannot be opted out of
const CRITICAL_NOTE_BY_CATEGORY: Record<NotificationCategory, string | null> = {
  team: "Invitation and removal notices are always sent",
  billing: "Past due and cancellation alerts are always sent",
  system: null,
};

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  team: "Team notifications",
  billing: "Billing notifications",
  system: "System notifications",
};

// Non-critical notification types per category (what can be toggled)
const TOGGLEABLE_BY_CATEGORY: Record<NotificationCategory, string[]> = {
  team: ["Invitation accepted", "Role changes"],
  billing: ["Plan upgrades", "Plan downgrades", "Subscription activated"],
  system: [],
};

interface PreferenceState {
  category: NotificationCategory;
  inAppEnabled: boolean;
  emailEnabled: boolean;
}

export function NotificationPreferencesForm({ preferences }: NotificationPreferencesFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  // Build initial state from props (fill missing categories with defaults)
  const [prefState, setPrefState] = useState<PreferenceState[]>(() => {
    const categories: NotificationCategory[] = ["team", "billing"];
    return categories.map((cat) => {
      const existing = preferences.find((p) => p.category === cat);
      return {
        category: cat,
        inAppEnabled: existing?.inAppEnabled ?? true,
        emailEnabled: existing?.emailEnabled ?? true,
      };
    });
  });

  function updatePref(
    category: NotificationCategory,
    field: "inAppEnabled" | "emailEnabled",
    value: boolean,
  ) {
    setPrefState((prev) =>
      prev.map((p) => (p.category === category ? { ...p, [field]: value } : p)),
    );
    setSavedOk(false);
  }

  async function handleSave() {
    setIsSaving(true);
    setSavedOk(false);
    try {
      const result = await updatePreferencesAction({
        preferences: prefState.map((p) => ({
          category: p.category,
          inAppEnabled: p.inAppEnabled,
          emailEnabled: p.emailEnabled,
        })),
      });
      if (result.success) {
        setSavedOk(true);
        router.refresh();
      }
    } finally {
      setIsSaving(false);
    }
  }

  const displayCategories = prefState.filter((p) => TOGGLEABLE_BY_CATEGORY[p.category].length > 0);

  return (
    <div className="flex flex-col gap-6">
      {displayCategories.map((pref, idx) => {
        const note = CRITICAL_NOTE_BY_CATEGORY[pref.category];
        const toggleable = TOGGLEABLE_BY_CATEGORY[pref.category];

        return (
          <div key={pref.category} className="flex flex-col gap-4">
            {idx > 0 && <Separator />}

            <h2 className="text-base font-semibold">{CATEGORY_LABELS[pref.category]}</h2>

            {/* Toggleable rows */}
            <div className="flex flex-col gap-3">
              {toggleable.map((label) => (
                <div key={label} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-foreground">{label}</span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">In-app</span>
                      <Switch
                        checked={pref.inAppEnabled}
                        onCheckedChange={(checked) =>
                          updatePref(pref.category, "inAppEnabled", checked)
                        }
                        aria-label={`${label} in-app notifications`}
                        disabled={isSaving}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Email</span>
                      <Switch
                        checked={pref.emailEnabled}
                        onCheckedChange={(checked) =>
                          updatePref(pref.category, "emailEnabled", checked)
                        }
                        aria-label={`${label} email notifications`}
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Critical events note */}
            {note && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Note:</span> {note}
              </p>
            )}
          </div>
        );
      })}

      <div className="flex items-center justify-end gap-3 pt-2">
        {savedOk && (
          <span className="text-sm text-muted-foreground">Notification preferences updated</span>
        )}
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className={cn(isSaving && "opacity-70")}
        >
          {isSaving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
