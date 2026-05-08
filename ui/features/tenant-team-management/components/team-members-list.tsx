import type { TenantMemberOutput } from "@enterprise/contracts";
import { Avatar, AvatarFallback, AvatarImage } from "@enterprise/ui/components/avatar";
import { Badge } from "@enterprise/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@enterprise/ui/components/table";
import { ChangeRoleDialog } from "./change-role-dialog";
import { RemoveMemberDialog } from "./remove-member-dialog";

interface TeamMembersListProps {
  members: TenantMemberOutput[];
  currentUserId: string;
  currentUserRole: string;
}

const ROLE_VARIANTS: Record<
  TenantMemberOutput["role"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  owner: "default",
  admin: "secondary",
  member: "outline",
  guest: "outline",
};

const ROLE_LABELS: Record<TenantMemberOutput["role"], string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  guest: "Guest",
};

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
    }
    return (parts[0]?.[0] ?? "").toUpperCase();
  }
  return email[0]?.toUpperCase() ?? "?";
}

export function TeamMembersList({ members, currentUserId, currentUserRole }: TeamMembersListProps) {
  const isAdminOrOwner = currentUserRole === "owner" || currentUserRole === "admin";

  if (members.length === 0) {
    return (
      <div className="rounded-lg border py-12 text-center">
        <p className="text-muted-foreground">No team members found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            {isAdminOrOwner && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id} data-testid="team-member-row">
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="size-8">
                    <AvatarImage
                      src={member.avatarUrl ?? undefined}
                      alt={member.name ?? member.email}
                    />
                    <AvatarFallback className="text-xs">
                      {getInitials(member.name, member.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{member.name ?? "—"}</span>
                </div>
              </TableCell>
              <TableCell>{member.email}</TableCell>
              <TableCell>
                <Badge variant={ROLE_VARIANTS[member.role]}>{ROLE_LABELS[member.role]}</Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {member.joinedAt.toLocaleDateString()}
              </TableCell>
              {isAdminOrOwner && (
                <TableCell className="text-right">
                  {member.id !== currentUserId && member.role !== "owner" && (
                    <div className="flex justify-end gap-2">
                      <ChangeRoleDialog
                        memberId={member.id}
                        currentRole={member.role}
                        memberName={member.name ?? member.email}
                      />
                      <RemoveMemberDialog
                        memberId={member.id}
                        memberName={member.name ?? member.email}
                      />
                    </div>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
