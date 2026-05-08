import type { TenantInvitationOutput } from "@enterprise/contracts";
import { Badge } from "@enterprise/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@enterprise/ui/components/table";
import { CancelInvitationButton } from "./cancel-invitation-button";
import { ResendInvitationButton } from "./resend-invitation-button";

interface TeamInvitationsListProps {
  invitations: TenantInvitationOutput[];
  isAdminOrOwner: boolean;
}

const STATUS_VARIANTS: Record<
  TenantInvitationOutput["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  accepted: "default",
  revoked: "destructive",
  expired: "outline",
};

const STATUS_LABELS: Record<TenantInvitationOutput["status"], string> = {
  pending: "Pending",
  accepted: "Accepted",
  revoked: "Revoked",
  expired: "Expired",
};

const ROLE_LABELS: Record<TenantInvitationOutput["role"], string> = {
  admin: "Admin",
  member: "Member",
  guest: "Guest",
};

export function TeamInvitationsList({ invitations, isAdminOrOwner }: TeamInvitationsListProps) {
  if (invitations.length === 0) {
    return (
      <div className="rounded-lg border py-12 text-center">
        <p className="text-muted-foreground">No pending invitations.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Expires</TableHead>
            {isAdminOrOwner && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.map((invitation) => (
            <TableRow key={invitation.id} data-testid="invitation-row">
              <TableCell>{invitation.email}</TableCell>
              <TableCell>{ROLE_LABELS[invitation.role]}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANTS[invitation.status]}>
                  {STATUS_LABELS[invitation.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {invitation.expiresAt.toLocaleDateString()}
              </TableCell>
              {isAdminOrOwner && (
                <TableCell className="text-right">
                  {invitation.status === "pending" && (
                    <div className="flex justify-end gap-2">
                      <ResendInvitationButton invitationId={invitation.id} />
                      <CancelInvitationButton invitationId={invitation.id} />
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
