import { FormSkeleton } from "@enterprise/ui/components/form-skeleton";

export default function SettingsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <FormSkeleton fields={4} />
    </div>
  );
}
