"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { surfboardApi } from "@/surfboard/apiClient";

export type BatchLockRole = "RECORDS_II" | "INTAKE" | "ACCOUNTS";

interface UseBatchLockProps {
  role: BatchLockRole;
  onLockAcquired?: (
    batchId: string,
    batchCode: string,
    planCount: number
  ) => void;
  onLockReleased?: () => void;
}

interface UseBatchLockReturn {
  lockedBatchId: string | null;
  lockedBatchCode: string | null;
  lockExpiresAt: Date | null;
  lockedPlanCount: number;
  isLocking: boolean;
  lockError: string | null;
  acquireLock: () => Promise<void>;
  releaseLock: () => Promise<void>;
  isBatchLockedByMe: (batchId: string) => boolean;
  showLeaveWarning: boolean;
  setShowLeaveWarning: (show: boolean) => void;
  confirmLeave: () => void;
  cancelLeave: () => void;
  pendingNavigation: string | null;
}

/**
 * Hook for batch-level locking (Records II, Intake, or Accounts).
 * Locks ALL eligible plans in a batch.
 */
export function useBatchLock({
  role,
  onLockAcquired,
  onLockReleased,
}: UseBatchLockProps): UseBatchLockReturn {
  const router = useRouter();

  const [lockedBatchId, setLockedBatchId] = useState<string | null>(null);
  const [lockedBatchCode, setLockedBatchCode] = useState<string | null>(null);
  const [lockExpiresAt, setLockExpiresAt] = useState<Date | null>(null);
  const [lockedPlanCount, setLockedPlanCount] = useState(0);
  const [isLocking, setIsLocking] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null
  );

  const hasLock = useRef(false);
  const isUnmounting = useRef(false);
  // Guards against overlapping acquireLock() calls (React Strict Mode's
  // double-invoked mount effect, or a fast refresh->approve->refresh
  // sequence) racing each other's setIsLocking(true/false) — without this,
  // whichever call's "finally" fires first can be stomped by the other's
  // setIsLocking(true), leaving the "Acquiring..." spinner and the stale
  // locked-batch banner stuck until a manual page refresh.
  const inFlightRef = useRef<Promise<void> | null>(null);

  // Acquire lock on the oldest available batch
  const acquireLock = useCallback(async () => {
    if (inFlightRef.current) return inFlightRef.current;

    const run = (async () => {
      setIsLocking(true);
      setLockError(null);

      try {
        const result = await surfboardApi.cod.locks.claimNextBatch(role as any);

        if (result.success) {
          if (result.data.locked && result.data.batchId) {
            setLockedBatchId(result.data.batchId);
            setLockedBatchCode(result.data.batchCode);
            setLockedPlanCount(result.data.planCount);
            setLockExpiresAt(
              result.data.lockExpiresAt
                ? new Date(result.data.lockExpiresAt)
                : null
            );
            hasLock.current = true;
            onLockAcquired?.(
              result.data.batchId,
              result.data.batchCode || "",
              result.data.planCount
            );
          } else {
            // No batches available to lock
            setLockedBatchId(null);
            setLockedBatchCode(null);
            setLockedPlanCount(0);
            setLockExpiresAt(null);
            hasLock.current = false;
          }
        } else {
          setLockError(result.error || "Failed to acquire batch lock");
        }
      } catch (error) {
        console.error("Error acquiring batch lock:", error);
        setLockError("An unexpected error occurred");
      } finally {
        setIsLocking(false);
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = run;
    return run;
  }, [role, onLockAcquired]);

  // Release the current lock
  const releaseLock = useCallback(async () => {
    if (!lockedBatchId || !hasLock.current) return;

    try {
      await surfboardApi.cod.locks.releaseBatch(role as any);
      setLockedBatchId(null);
      setLockedBatchCode(null);
      setLockedPlanCount(0);
      setLockExpiresAt(null);
      hasLock.current = false;
      onLockReleased?.();
    } catch (error) {
      console.error("Error releasing batch lock:", error);
    }
  }, [lockedBatchId, role, onLockReleased]);

  // Release all locks (called on page leave)
  const releaseAllLocks = useCallback(async () => {
    try {
      await surfboardApi.cod.locks.releaseBatch(role as any);
      setLockedBatchId(null);
      setLockedBatchCode(null);
      setLockedPlanCount(0);
      setLockExpiresAt(null);
      hasLock.current = false;
    } catch (error) {
      console.error("Error releasing all batch locks:", error);
    }
  }, [role]);

  // Check if a specific batch is locked by the current user
  const isBatchLockedByMe = useCallback(
    (batchId: string) => {
      return lockedBatchId === batchId;
    },
    [lockedBatchId]
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
      if (hasLock.current && lockedBatchId) {
        e.preventDefault();
        e.returnValue =
          "You have a locked batch. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [lockedBatchId]);

  // Handle visibility change (tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && isUnmounting.current) {
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
        releaseAllLocks();
      }
    };
  }, [releaseAllLocks]);

  // Auto-acquire lock on mount
  useEffect(() => {
    acquireLock();
  }, []);

  return {
    lockedBatchId,
    lockedBatchCode,
    lockExpiresAt,
    lockedPlanCount,
    isLocking,
    lockError,
    acquireLock,
    releaseLock,
    isBatchLockedByMe,
    showLeaveWarning,
    setShowLeaveWarning,
    confirmLeave,
    cancelLeave,
    pendingNavigation,
  };
}
