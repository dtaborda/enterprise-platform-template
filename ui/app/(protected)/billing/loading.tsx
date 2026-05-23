import { CardSkeleton } from "@enterprise/ui/components/card-skeleton";
import { TableSkeleton } from "@enterprise/ui/components/table-skeleton";

export default function BillingLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <TableSkeleton rows={5} columns={4} />
    </div>
  );
}
