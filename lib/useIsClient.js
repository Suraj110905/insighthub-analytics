"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * Hook to safely detect if code is running in the client browser.
 * Uses React 18+ useSyncExternalStore to avoid hydration mismatches
 * and prevent cascading render linter errors.
 */
export function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
