import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createSession,
  deleteMessage,
  fetchMessage,
  forgetSession,
  listMessages,
  loadStoredSession,
  resumeSession,
  storeSession,
  type MailSession,
} from "@/lib/tempmail";
import { senderName, type StoredMessage } from "@/lib/mailbox";
import { playChime } from "@/lib/sound";
import { mailbox } from "@/stores/mailbox";
import { settingsStore, useSettings } from "@/stores/settings";

type Status = "booting" | "ready" | "empty" | "error";

interface MailSessionValue {
  session: MailSession | null;
  status: Status;
  busy: null | "generate" | "delete";
  error: string | null;
  intervalMs: number;
  refreshing: boolean;
  lastChecked: number;
  generate: () => Promise<MailSession>;
  destroyAddress: () => Promise<void>;
  refresh: () => void;
  /** Permanently delete messages, also removing remote mail from the provider when possible. */
  destroyMessages: (ids: string[]) => void;
  /** Fetch and cache the body of a remote message. */
  loadBody: (m: StoredMessage) => Promise<string>;
  notifyArrival: (msgs: StoredMessage[]) => void;
}

const Ctx = createContext<MailSessionValue | null>(null);

export function useMailSession() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMailSession must be used inside MailSessionProvider");
  return v;
}

export function notifyArrival(msgs: StoredMessage[]) {
  if (!msgs.length) return;
  const { popups, sound } = settingsStore.get();
  if (sound) playChime();
  if (!popups) return;
  const first = msgs[0]!;
  if (msgs.length === 1) {
    toast(`New message from ${senderName(first.from)}`, { description: first.subject });
  } else {
    toast(`${msgs.length} new messages`);
  }
}

export function MailSessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const settings = useSettings();
  const [session, setSession] = useState<MailSession | null>(null);
  const [status, setStatus] = useState<Status>("booting");
  const [busy, setBusy] = useState<null | "generate" | "delete">(null);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<MailSession | null>(null);
  sessionRef.current = session;

  const commit = useCallback((s: MailSession | null) => {
    sessionRef.current = s;
    setSession(s);
    storeSession(s);
    setStatus(s ? "ready" : "empty");
  }, []);

  const generate = useCallback(async () => {
    setBusy("generate");
    setError(null);
    try {
      const prev = sessionRef.current;
      if (prev) void forgetSession(prev);
      const next = await createSession();
      qc.removeQueries({ queryKey: ["inbox"] });
      commit(next);
      return next;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reach the mail service");
      if (!sessionRef.current) setStatus("error");
      throw e;
    } finally {
      setBusy(null);
    }
  }, [commit, qc]);

  const destroyAddress = useCallback(async () => {
    const prev = sessionRef.current;
    if (!prev) return;
    setBusy("delete");
    try {
      await forgetSession(prev);
    } finally {
      mailbox.purgeAddress(prev.address);
      qc.removeQueries({ queryKey: ["inbox"] });
      commit(null);
      setBusy(null);
    }
  }, [commit, qc]);

  // Restore a saved address on first load, otherwise create one.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = loadStoredSession();
      try {
        const s = stored ? await resumeSession(stored) : await createSession();
        if (!cancelled) commit(s);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Could not reach the mail service");
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [commit]);

  const loadBody = useCallback(async (m: StoredMessage) => {
    const s = sessionRef.current;
    if (m.body !== undefined) return m.body;
    if (!s || !m.remoteId || m.address !== s.address) {
      throw new Error("This address has expired, so the full message can no longer be downloaded.");
    }
    const detail = await fetchMessage(s, m.remoteId);
    mailbox.setBody(m.id, detail.bodyHtml);
    return detail.bodyHtml;
  }, []);

  const intervalMs = settings.refreshInterval * 1000;

  const inbox = useQuery({
    queryKey: ["inbox", session?.address],
    enabled: !!session,
    refetchInterval: intervalMs > 0 ? intervalMs : false,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const s = sessionRef.current!;
      const { messages, sidToken } = await listMessages(s);
      if (sidToken !== s.sidToken) {
        const updated = { ...s, sidToken };
        sessionRef.current = updated;
        setSession(updated);
        storeSession(updated);
      }
      const fresh = mailbox.ingestRemote(s.address, messages);
      notifyArrival(fresh);
      // Cache full bodies right away so saved and archived mail outlives the address.
      for (const m of fresh) {
        try {
          await loadBody(m);
        } catch {
          /* retried when the message is opened */
        }
      }
      return messages.length;
    },
  });

  const destroyMessages = useCallback((ids: string[]) => {
    const s = sessionRef.current;
    if (s) {
      for (const id of ids) {
        const m = mailbox.get(id);
        if (m?.source === "remote" && m.remoteId && m.address === s.address) {
          void deleteMessage(s, m.remoteId).catch(() => {});
        }
      }
    }
    mailbox.destroy(ids);
  }, []);

  const value = useMemo<MailSessionValue>(
    () => ({
      session,
      status,
      busy,
      error,
      intervalMs,
      refreshing: inbox.isFetching,
      lastChecked: inbox.dataUpdatedAt,
      generate,
      destroyAddress,
      refresh: () => void inbox.refetch(),
      destroyMessages,
      loadBody,
      notifyArrival,
    }),
    [session, status, busy, error, intervalMs, inbox, generate, destroyAddress, destroyMessages, loadBody],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
