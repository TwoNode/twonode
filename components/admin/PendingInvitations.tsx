"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Ban } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/hooks/useConfirm";
import { roleLabel, type AdminInvitationRow, type AdminInvitationStatus, type InviteResult } from "@/lib/api/adminInvitationTypes";
import type { ApiResult } from "@/lib/api/types";

export interface InvitationsApi {
  list: () => Promise<ApiResult<AdminInvitationRow[]>>;
  resend: (id: string) => Promise<ApiResult<InviteResult>>;
  revoke: (id: string) => Promise<ApiResult<AdminInvitationRow>>;
}

const INVITATIONS_CHANGED = "admin-invitations:changed";

/**
 * Words the outcome (inviting and resending can both save the invitation yet
 * fail to email it) and tells any mounted <PendingInvitations> to refresh, so
 * the invite form and the list need no shared state — they can sit anywhere
 * on the page.
 */
export function announceInviteResult(email: string, verb: "sent" | "resent", result: InviteResult) {
  if (result.emailSent) toast.success(`Invitation ${verb} to ${email}`);
  else toast.warning(`Invitation saved for ${email}, but the email couldn't be sent. Use Resend to try again.`);
  window.dispatchEvent(new Event(INVITATIONS_CHANGED));
}

const STATUS_STYLE: Record<AdminInvitationStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  EXPIRED: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300",
  REVOKED: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  ACCEPTED: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300",
};

const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

/**
 * Invitations for new admins on one product — pending ones can be resent
 * (fresh link and expiry) or revoked, and accepted/expired/revoked ones stay
 * listed as a history. Shared by GBC, Surfboard and REVA; each passes its own
 * client, and it refreshes whenever announceInviteResult() fires.
 */
export function PendingInvitations({ api }: { api: InvitationsApi }) {
  const [rows, setRows] = useState<AdminInvitationRow[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  const load = useCallback(async () => {
    try {
      const res = await api.list();
      if (res.success) {
        setRows(res.data);
        setLoadError(false);
      } else {
        setLoadError(true);
      }
    } catch {
      setLoadError(true);
    }
  }, [api]);

  useEffect(() => {
    load();
    window.addEventListener(INVITATIONS_CHANGED, load);
    return () => window.removeEventListener(INVITATIONS_CHANGED, load);
  }, [load]);

  async function resend(row: AdminInvitationRow) {
    setBusyId(row.id);
    try {
      const res = await api.resend(row.id);
      if (res.success) announceInviteResult(row.email, "resent", res.data);
      else {
        toast.error(res.error || "Failed to resend the invitation");
        load();
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setBusyId(null);
    }
  }

  async function revoke(row: AdminInvitationRow) {
    const ok = await confirm({
      title: "Revoke invitation?",
      description: `The link sent to ${row.email} will stop working. You can invite them again later.`,
      confirmLabel: "Revoke",
      variant: "destructive",
    });
    if (!ok) return;

    setBusyId(row.id);
    try {
      const res = await api.revoke(row.id);
      if (res.success) toast.success(`Invitation for ${row.email} revoked`);
      else toast.error(res.error || "Failed to revoke the invitation");
    } catch {
      toast.error("An error occurred");
    } finally {
      setBusyId(null);
      load();
    }
  }

  return (
    <Card className="p-4 sm:p-6 mb-6 sm:mb-8">
      <div className="mb-4">
        <h2 className="text-lg sm:text-xl font-bold">Invitations</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          New admins get an emailed link to set their password. Links work once and expire after 7 days.
        </p>
      </div>

      {rows === null && !loadError ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : loadError ? (
        <p className="text-sm text-red-600 py-4">Couldn&apos;t load invitations. Refresh the page to try again.</p>
      ) : rows!.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No invitations yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b dark:border-white/10">
                <th className="py-2 pr-4 font-medium">Invitee</th>
                <th className="py-2 pr-4 font-medium">Role</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Invited by</th>
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows!.map((row) => (
                <tr key={row.id} className="border-b last:border-0 dark:border-white/10 align-top">
                  <td className="py-3 pr-4">
                    <div className="font-medium">{row.firstName} {row.lastName}</div>
                    <div className="text-gray-500 dark:text-gray-400">{row.email}</div>
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">{roleLabel(row.role)}</td>
                  <td className="py-3 pr-4">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[row.status]}`}>
                      {row.status.charAt(0) + row.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="py-3 pr-4">{row.invitedByName}</td>
                  <td className="py-3 pr-4 whitespace-nowrap text-gray-600 dark:text-gray-300">
                    {row.status === "ACCEPTED" && row.acceptedAt
                      ? `Joined ${formatDate(row.acceptedAt)}`
                      : row.status === "PENDING"
                        ? `Expires ${formatDate(row.expiresAt)}`
                        : formatDate(row.createdAt)}
                  </td>
                  <td className="py-3 text-right whitespace-nowrap">
                    {(row.status === "PENDING" || row.status === "EXPIRED") && (
                      <Button variant="ghost" size="sm" disabled={busyId === row.id} onClick={() => resend(row)}>
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Resend
                      </Button>
                    )}
                    {row.status === "PENDING" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busyId === row.id}
                        onClick={() => revoke(row)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Ban className="h-4 w-4 mr-1" />
                        Revoke
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {ConfirmDialog}
    </Card>
  );
}
