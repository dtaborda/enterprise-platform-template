import { TableSkeleton } from "@enterprise/ui/components/table-skeleton";

export default function NotificationsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <TableSkeleton rows={6} columns={3} />
    </div>
  );
}
