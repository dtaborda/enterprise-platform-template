import { CardSkeleton } from "@enterprise/ui/components/card-skeleton";

/**
 * Group-level fallback for every route under (protected).
 *
 * Next.js resolves the nearest loading.tsx, so segments with their own file keep
 * their tailored skeleton. This neutral fallback guarantees that any NEW protected
 * route streams a skeleton instead of a frozen screen, without extra wiring.
 */
export default function ProtectedLoading() {
  return (
    <div className="flex flex-col gap-6">
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}
