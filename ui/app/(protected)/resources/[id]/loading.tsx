import { CardSkeleton } from "@enterprise/ui/components/card-skeleton";

export default function ResourceDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      <CardSkeleton />
    </div>
  );
}
