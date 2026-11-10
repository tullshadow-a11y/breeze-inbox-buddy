import { useEffect, useState } from "react";

import { STORAGE_QUOTA_BYTES, storageHealth } from "@/lib/mailbox";
import { mailboxStore } from "@/stores/mailbox";
import { settingsStore } from "@/stores/settings";

const PREFIX = "umbra-mail.";

/** Bytes this app keeps in localStorage (UTF-16, so 2 bytes per character). */
export function measureStorage() {
  let bytes = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(PREFIX)) continue;
    bytes += (key.length + (localStorage.getItem(key)?.length ?? 0)) * 2;
  }
  return bytes;
}

export function useStorageUsage() {
  const [used, setUsed] = useState(0);
  useEffect(() => {
    const update = () => setUsed(measureStorage());
    update();
    const a = mailboxStore.subscribe(update);
    const b = settingsStore.subscribe(update);
    return () => {
      a();
      b();
    };
  }, []);
  return {
    used,
    quota: STORAGE_QUOTA_BYTES,
    ratio: Math.min(1, used / STORAGE_QUOTA_BYTES),
    health: storageHealth(used),
  };
}
