"use client";

import { Badge } from "@/components/ui/badge";
import { Lock, Clock } from "lucide-react";
import { UnlockButton } from "./UnlockButton";

interface PlanLockIndicatorProps {
  planNumber: string;
  lockExpiresAt: Date | null;
  onUnlock: () => void;
  isUnlocking?: boolean;
}

export function PlanLockIndicator({
  planNumber,
  lockExpiresAt,
  onUnlock,
  isUnlocking = false,
}: PlanLockIndicatorProps) {
  const formatTimeRemaining = (expiresAt: Date | null) => {
    if (!expiresAt) return "";
    const now = new Date();
    const diff = new Date(expiresAt).getTime() - now.getTime();
    if (diff <= 0) return "Expired";
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "< 1 min";
    return `${minutes} min`;
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-linear-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
      <div className="flex items-center gap-2 flex-1">
        <div className="p-1.5 bg-blue-100 rounded-full">
          <Lock className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-blue-900">
            You're working on: <strong>{planNumber}</strong>
          </span>
          {lockExpiresAt && (
            <span className="text-xs text-blue-600 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Lock expires in {formatTimeRemaining(lockExpiresAt)}
            </span>
          )}
        </div>
      </div>
      <UnlockButton
        planNumber={planNumber}
        onUnlock={onUnlock}
        isUnlocking={isUnlocking}
      />
    </div>
  );
}

interface LockedPlanBadgeProps {
  isLockedByMe: boolean;
  isLockedByOther?: boolean;
}

export function LockedPlanBadge({
  isLockedByMe,
  isLockedByOther,
}: LockedPlanBadgeProps) {
  if (isLockedByMe) {
    return (
      <Badge className="bg-blue-100 text-blue-700 border-blue-300">
        <Lock className="w-3 h-3 mr-1" />
        Your Lock
      </Badge>
    );
  }
  if (isLockedByOther) {
    return (
      <Badge variant="outline" className="text-gray-500 border-gray-300">
        <Lock className="w-3 h-3 mr-1" />
        Locked
      </Badge>
    );
  }
  return null;
}
