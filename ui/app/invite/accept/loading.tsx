import { CardSkeleton } from "@enterprise/ui/components/card-skeleton";

export default function AcceptInviteLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md">
        <CardSkeleton />
      </div>
    </div>
  );
}
