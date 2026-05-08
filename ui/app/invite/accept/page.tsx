import { acceptTenantInvitation } from "@enterprise/core/services";
import { getAdminClient } from "@enterprise/core/supabase/admin";
import Link from "next/link";

export const metadata = { title: "Accept Invitation" };

interface AcceptInvitePageProps {
  searchParams?: Promise<Record<string, string | string[]>>;
}

export default async function AcceptInvitePage({ searchParams }: AcceptInvitePageProps) {
  const params = (await searchParams) ?? {};
  const token = typeof params["token"] === "string" ? params["token"] : null;

  if (!token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-bold">Invalid Invitation Link</h1>
        <p className="text-muted-foreground">
          The invitation link is missing or invalid. Please request a new invitation.
        </p>
        <Link href="/sign-in" className="text-primary hover:underline">
          Go to sign in
        </Link>
      </div>
    );
  }

  const adminClient = getAdminClient();
  const result = await acceptTenantInvitation(adminClient, token);

  if (!result.success) {
    const errorMessages: Record<string, string> = {
      INVITATION_NOT_FOUND: "This invitation link is invalid or has already been used.",
      INVITATION_ALREADY_USED: "This invitation has already been accepted.",
      INVITATION_EXPIRED: "This invitation has expired. Please request a new one.",
      INVITATION_LOOKUP_FAILED: "Could not verify this invitation. Please try again later.",
    };

    const message =
      result.code && result.code in errorMessages
        ? errorMessages[result.code]
        : "There was a problem accepting your invitation. Please try again.";

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-bold">Invitation Error</h1>
        <p className="text-muted-foreground">{message}</p>
        <Link href="/sign-in" className="text-primary hover:underline">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-bold">Welcome to the Team!</h1>
      <p className="text-muted-foreground">
        Your invitation has been accepted. You can now sign in to access the platform.
      </p>
      <Link
        href="/sign-in"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Sign In
      </Link>
    </div>
  );
}
