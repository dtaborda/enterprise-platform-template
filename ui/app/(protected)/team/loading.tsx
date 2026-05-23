import { TableSkeleton } from "@enterprise/ui/components/table-skeleton";

export default function TeamLoading() {
  return (
    <div className="flex flex-col gap-6">
      <TableSkeleton rows={5} columns={4} />
    </div>
  );
}
