import { FormSkeleton } from "@enterprise/ui/components/form-skeleton";

export default function NewResourceLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="max-w-3xl">
        <FormSkeleton fields={6} />
      </div>
    </div>
  );
}
