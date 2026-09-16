import { useEffect } from "react";
import { useAuthStore } from "../state/authStore.js";
import { useAppStore } from "../state/appStore.js";

/**
 * Bridges auth state to the data store: whenever the signed-in user changes, tells the app
 * store who to sync as (or to stop syncing). Also re-syncs whenever the browser comes back
 * online, so a device that was offline mid-session catches up automatically.
 */
export function useCloudSyncOrchestrator(): void {
  const authInit = useAuthStore((s) => s.init);
  const userId = useAuthStore((s) => s.user?.uid ?? null);
  const setCloudUid = useAppStore((s) => s.setCloudUid);
  const syncNow = useAppStore((s) => s.syncNow);
  const loaded = useAppStore((s) => s.loaded);

  useEffect(() => {
    authInit();
  }, [authInit]);

  useEffect(() => {
    if (!loaded) return;
    void setCloudUid(userId);
  }, [loaded, userId, setCloudUid]);

  useEffect(() => {
    function handleOnline() {
      void syncNow();
    }
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [syncNow]);
}
