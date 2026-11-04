import { CardSkeleton } from "@enterprise/ui/components/card-skeleton";

export default function OnboardingLoading() {
  return (
    <div className="mx-auto max-w-2xl">
      <CardSkeleton />
    </div>
  );
}
