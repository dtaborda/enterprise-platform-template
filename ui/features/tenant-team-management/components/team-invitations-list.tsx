import type { TenantInvitationOutput } from "@enterprise/contracts";
import { Badge } from "@enterprise/ui/components/badge";
import { EmptyState } from "@enterprise/ui/components/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@enterprise/ui/components/table";
import { Mail } from "lucide-react";
import { CancelInvitationButton } from "./cancel-invitation-button";
import { ResendInvitationButton } from "./resend-invitation-button";

interface TeamInvitationsListProps {
  invitations: TenantInvitationOutput[];
  isAdminOrOwner: boolean;
}

const STATUS_VARIANTS: Record<
  TenantInvitationOutput["status"],
  "warning" | "success" | "destructive" | "neutral"
> = {
  pending: "warning",
  accepted: "success",
  revoked: "destructive",
  expired: "neutral",
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
      <EmptyState
        icon={Mail}
        title="No pending invitations"
        description="Invite team members to collaborate in your workspace."
      />
    );
  }

  return (
    <div className="rounded-xl bg-card">
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
