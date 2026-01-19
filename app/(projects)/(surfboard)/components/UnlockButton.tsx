"use client";

import { Button } from "@/components/ui/button";
import { LockOpen, Loader2 } from "lucide-react";

interface UnlockButtonProps {
  planNumber: string;
  onUnlock: () => void;
  isUnlocking?: boolean;
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function UnlockButton({
  planNumber,
  onUnlock,
  isUnlocking = false,
  variant = "outline",
  size = "sm",
  className = "",
}: UnlockButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onUnlock}
      disabled={isUnlocking}
      className={`border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 ${className}`}
      title={`Unlock ${planNumber} so another admin can work on it`}
    >
      {isUnlocking ? (
        <>
          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          Unlocking...
        </>
      ) : (
        <>
          <LockOpen className="w-4 h-4 mr-1" />
          Unlock
        </>
      )}
    </Button>
  );
}
