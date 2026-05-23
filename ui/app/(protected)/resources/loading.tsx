import { TableSkeleton } from "@enterprise/ui/components/table-skeleton";

export default function ResourcesLoading() {
  return (
    <div className="flex flex-col gap-6">
      <TableSkeleton rows={5} columns={5} />
    </div>
  );
}
