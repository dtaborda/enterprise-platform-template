import { requireAuth } from "@/features/auth/queries";
import { InviteMemberDialog } from "@/features/tenant-team-management/components/invite-member-dialog";
import { TeamInvitationsList } from "@/features/tenant-team-management/components/team-invitations-list";
import { TeamMembersList } from "@/features/tenant-team-management/components/team-members-list";
import { getTeamInvitations, getTeamMembers } from "@/features/tenant-team-management/queries";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const user = await requireAuth();
  const isAdminOrOwner = user.role === "owner" || user.role === "admin";

  const [members, invitations] = await Promise.all([
    getTeamMembers(user.tenantId),
    getTeamInvitations(user.tenantId),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl font-bold">Team</h1>
          <p className="text-muted-foreground">Manage your team members and pending invitations</p>
        </div>
        {isAdminOrOwner && <InviteMemberDialog />}
      </div>

      <section aria-labelledby="members-heading">
        <h2 id="members-heading" className="mb-4 text-lg font-semibold">
          Members
        </h2>
        <TeamMembersList members={members} currentUserId={user.id} currentUserRole={user.role} />
      </section>

      <section aria-labelledby="invitations-heading">
        <h2 id="invitations-heading" className="mb-4 text-lg font-semibold">
          Invitations
        </h2>
        <TeamInvitationsList invitations={invitations} isAdminOrOwner={isAdminOrOwner} />
      </section>
    </div>
  );
}
