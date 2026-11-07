import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createSession,
  deleteMessage,
  forgetSession,
  listMessages,
  loadStoredSession,
  resumeSession,
  storeSession,
  type MailSession,
} from "@/lib/tempmail";

export const POLL_INTERVAL_MS = 10_000;

type Status = "booting" | "ready" | "empty" | "error";

export function useTempMail() {
  const qc = useQueryClient();
  const [session, setSession] = useState<MailSession | null>(null);
  const [status, setStatus] = useState<Status>("booting");
  const [busy, setBusy] = useState<null | "generate" | "delete">(null);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<MailSession | null>(null);
  sessionRef.current = session;

  const commit = useCallback((s: MailSession | null) => {
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

  const destroy = useCallback(async () => {
    const prev = sessionRef.current;
    if (!prev) return;
    setBusy("delete");
    try {
      await forgetSession(prev);
    } finally {
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

  const inbox = useQuery({
    queryKey: ["inbox", session?.address],
    enabled: !!session,
    refetchInterval: POLL_INTERVAL_MS,
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
      return messages;
    },
  });

  const removeMessage = useCallback(
    async (id: string) => {
      const s = sessionRef.current;
      if (!s) return;
      qc.setQueryData<typeof inbox.data>(["inbox", s.address], (old) =>
        old?.filter((m) => m.id !== id),
      );
      await deleteMessage(s, id);
    },
    [qc],
  );

  return {
    session,
    status,
    busy,
    error,
    generate,
    destroy,
    removeMessage,
    messages: inbox.data ?? [],
    inboxLoading: inbox.isPending && !!session,
    inboxFetching: inbox.isFetching,
    inboxError: inbox.error,
    lastUpdated: inbox.dataUpdatedAt,
    refresh: () => inbox.refetch(),
  };
}
