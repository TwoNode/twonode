"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  getAndLockOldestAvailablePlan,
  releaseAllLocksForUser,
} from "../actions/codActions";

type MDARole = "CHARTING" | "SURCON" | "RECORDS_I" | "RECORDS_II";

interface UsePlanLockProps {
  role: MDARole;
  onLockAcquired?: (planId: string, planNumber: string) => void;
  onLockReleased?: () => void;
}

interface UsePlanLockReturn {
  lockedPlanId: string | null;
  lockedPlanNumber: string | null;
  lockExpiresAt: Date | null;
  isLocking: boolean;
  lockError: string | null;
  acquireLock: () => Promise<void>;
  releaseLock: () => Promise<void>;
  isLockedByMe: (planId: string) => boolean;
  showLeaveWarning: boolean;
  setShowLeaveWarning: (show: boolean) => void;
  confirmLeave: () => void;
  cancelLeave: () => void;
  pendingNavigation: string | null;
}

export function usePlanLock({
  role,
  onLockAcquired,
  onLockReleased,
}: UsePlanLockProps): UsePlanLockReturn {
  const router = useRouter();
  const pathname = usePathname();

  const [lockedPlanId, setLockedPlanId] = useState<string | null>(null);
  const [lockedPlanNumber, setLockedPlanNumber] = useState<string | null>(null);
  const [lockExpiresAt, setLockExpiresAt] = useState<Date | null>(null);
  const [isLocking, setIsLocking] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null
  );

  const hasLock = useRef(false);
  const isUnmounting = useRef(false);

  // Acquire lock on the oldest available plan
  const acquireLock = useCallback(async () => {
    setIsLocking(true);
    setLockError(null);

    try {
      const result = await getAndLockOldestAvailablePlan(role);

      if (result.success && result.data) {
        if (result.data.locked && result.data.planId) {
          setLockedPlanId(result.data.planId);
          setLockedPlanNumber(result.data.planNumber);
          setLockExpiresAt(
            result.data.lockExpiresAt
              ? new Date(result.data.lockExpiresAt)
              : null
          );
          hasLock.current = true;
          onLockAcquired?.(result.data.planId, result.data.planNumber || "");
        } else {
          // No plans available to lock
          setLockedPlanId(null);
          setLockedPlanNumber(null);
          setLockExpiresAt(null);
          hasLock.current = false;
        }
      } else {
        setLockError(result.error || "Failed to acquire lock");
      }
    } catch (error) {
      console.error("Error acquiring lock:", error);
      setLockError("An unexpected error occurred");
    } finally {
      setIsLocking(false);
    }
  }, [role, onLockAcquired]);

  // Release the current lock
  const releaseLock = useCallback(async () => {
    if (!lockedPlanId || !hasLock.current) return;

    try {
      await releaseAllLocksForUser(role);
      setLockedPlanId(null);
      setLockedPlanNumber(null);
      setLockExpiresAt(null);
      hasLock.current = false;
      onLockReleased?.();
    } catch (error) {
      console.error("Error releasing lock:", error);
    }
  }, [lockedPlanId, role, onLockReleased]);

  // Release all locks for the user (called on page leave)
  const releaseAllLocks = useCallback(async () => {
    try {
      await releaseAllLocksForUser(role);
      setLockedPlanId(null);
      setLockedPlanNumber(null);
      setLockExpiresAt(null);
      hasLock.current = false;
    } catch (error) {
      console.error("Error releasing all locks:", error);
    }
  }, [role]);

  // Check if a specific plan is locked by the current user
  const isLockedByMe = useCallback(
    (planId: string) => {
      return lockedPlanId === planId;
    },
    [lockedPlanId]
  );

  // Handle confirming navigation
  const confirmLeave = useCallback(async () => {
    setShowLeaveWarning(false);
    await releaseAllLocks();

    if (pendingNavigation) {
      router.push(pendingNavigation);
      setPendingNavigation(null);
    }
  }, [releaseAllLocks, pendingNavigation, router]);

  // Handle cancelling navigation
  const cancelLeave = useCallback(() => {
    setShowLeaveWarning(false);
    setPendingNavigation(null);
  }, []);

  // Handle browser beforeunload event
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasLock.current && lockedPlanId) {
        e.preventDefault();
        e.returnValue =
          "You have a locked plan. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [lockedPlanId]);

  // Handle visibility change (tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && isUnmounting.current) {
        // Release locks when the page is hidden during unmount
        releaseAllLocks();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [releaseAllLocks]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmounting.current = true;
      if (hasLock.current) {
        // Use sendBeacon for reliable cleanup on page unload
        releaseAllLocks();
      }
    };
  }, [releaseAllLocks]);

  // Auto-acquire lock on mount
  useEffect(() => {
    acquireLock();
  }, []);

  return {
    lockedPlanId,
    lockedPlanNumber,
    lockExpiresAt,
    isLocking,
    lockError,
    acquireLock,
    releaseLock,
    isLockedByMe,
    showLeaveWarning,
    setShowLeaveWarning,
    confirmLeave,
    cancelLeave,
    pendingNavigation,
  };
}
