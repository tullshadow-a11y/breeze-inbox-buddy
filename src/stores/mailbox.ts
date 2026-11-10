import { createPersistentStore, useStore } from "@/lib/persistent-store";
import {
  EMPTY_MAILBOX,
  makeExcerpt,
  moveTo,
  remoteKey,
  restore,
  type Folder,
  type MailboxState,
  type StoredMessage,
} from "@/lib/mailbox";
import type { MailSummary } from "@/lib/tempmail";

export const MAILBOX_KEY = "umbra-mail.mailbox.v1";
const MAX_TOMBSTONES = 500;

function reviveMailbox(raw: unknown): MailboxState {
  const r = (raw ?? {}) as Partial<MailboxState>;
  return {
    messages: Array.isArray(r.messages) ? r.messages.filter((m) => m && typeof m.id === "string") : [],
    tombstones: Array.isArray(r.tombstones) ? r.tombstones : [],
    receivedTotal: typeof r.receivedTotal === "number" ? r.receivedTotal : 0,
  };
}

export const mailboxStore = createPersistentStore<MailboxState>(MAILBOX_KEY, EMPTY_MAILBOX, reviveMailbox);

export const useMailbox = () => useStore(mailboxStore);

const newId = () => `local:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

function update(id: string, fn: (m: StoredMessage) => StoredMessage) {
  mailboxStore.set((s) => ({ ...s, messages: s.messages.map((m) => (m.id === id ? fn(m) : m)) }));
}

export const mailbox = {
  get: (id: string) => mailboxStore.get().messages.find((m) => m.id === id),

  /** Add remote inbox mail we haven't seen; returns only the genuinely new messages. */
  ingestRemote(address: string, list: MailSummary[]): StoredMessage[] {
    const state = mailboxStore.get();
    const known = new Set(state.messages.map((m) => m.id));
    const dead = new Set(state.tombstones);
    const fresh: StoredMessage[] = list
      .map((r) => ({ r, id: remoteKey(address, r.id) }))
      .filter(({ id }) => !known.has(id) && !dead.has(id))
      .map(({ r, id }) => ({
        id,
        source: "remote",
        remoteId: r.id,
        address,
        folder: "inbox",
        from: r.from,
        to: address,
        subject: r.subject,
        excerpt: r.excerpt,
        bodyFormat: "html",
        timestamp: r.timestamp,
        read: r.read,
        starred: false,
        encrypted: false,
        hasAttachments: r.hasAttachments,
      }));
    if (fresh.length) {
      mailboxStore.set((s) => ({
        ...s,
        messages: [...fresh, ...s.messages],
        receivedTotal: s.receivedTotal + fresh.length,
      }));
    }
    return fresh;
  },

  setBody(id: string, body: string) {
    update(id, (m) => ({ ...m, body }));
  },

  markRead(id: string, read = true) {
    const m = mailbox.get(id);
    if (m && m.read !== read) update(id, (x) => ({ ...x, read }));
  },

  toggleStar(id: string) {
    update(id, (m) => ({ ...m, starred: !m.starred }));
  },

  move(id: string, folder: Folder) {
    update(id, (m) => moveTo(m, folder));
  },

  restore(id: string) {
    update(id, restore);
  },

  /** Permanently remove; remote ids are remembered so the next check doesn't re-add them. */
  destroy(ids: string[]) {
    const drop = new Set(ids);
    mailboxStore.set((s) => {
      const removedRemote = s.messages.filter((m) => drop.has(m.id) && m.source === "remote").map((m) => m.id);
      return {
        ...s,
        messages: s.messages.filter((m) => !drop.has(m.id)),
        tombstones: [...removedRemote, ...s.tombstones].slice(0, MAX_TOMBSTONES),
      };
    });
  },

  emptyTrash() {
    mailbox.destroy(mailboxStore.get().messages.filter((m) => m.folder === "trash").map((m) => m.id));
  },

  /** Drop an address's inbox mail; starred or filed messages are kept. */
  purgeAddress(address: string) {
    mailbox.destroy(
      mailboxStore
        .get()
        .messages.filter((m) => m.address === address && m.folder === "inbox" && !m.starred)
        .map((m) => m.id),
    );
  },

  saveDraft(draft: { id?: string; to: string; subject: string; body: string; encrypted: boolean; from: string }) {
    const id = draft.id ?? newId();
    const msg: StoredMessage = {
      id,
      source: "local",
      folder: "drafts",
      from: draft.from,
      to: draft.to,
      subject: draft.subject,
      excerpt: makeExcerpt(draft.body),
      body: draft.body,
      bodyFormat: "text",
      timestamp: Date.now(),
      read: true,
      starred: mailbox.get(id)?.starred ?? false,
      encrypted: draft.encrypted,
      hasAttachments: false,
    };
    mailboxStore.set((s) => ({
      ...s,
      messages: s.messages.some((m) => m.id === id)
        ? s.messages.map((m) => (m.id === id ? msg : m))
        : [msg, ...s.messages],
    }));
    return id;
  },

  /**
   * Record an outgoing internal message in Sent and deliver a copy to the inbox
   * of `deliverTo` (the user's own temporary address).
   */
  send(input: {
    from: string;
    to: string;
    subject: string;
    body: string;
    excerpt: string;
    encrypted: boolean;
    deliverTo: string | null;
  }) {
    const now = Date.now();
    const base = {
      source: "local" as const,
      from: input.from,
      to: input.to,
      subject: input.subject || "(no subject)",
      excerpt: input.excerpt,
      body: input.body,
      bodyFormat: "text" as const,
      starred: false,
      encrypted: input.encrypted,
      hasAttachments: false,
    };
    const sent: StoredMessage = { ...base, id: newId(), folder: "sent", outgoing: true, timestamp: now, read: true };
    mailboxStore.set((s) => ({ ...s, messages: [sent, ...s.messages] }));
    return { sent, deliver: () => mailbox.deliver({ ...base, address: input.deliverTo ?? undefined }) };
  },

  deliver(base: Omit<StoredMessage, "id" | "folder" | "timestamp" | "read">) {
    const msg: StoredMessage = { ...base, id: newId(), folder: "inbox", timestamp: Date.now(), read: false };
    mailboxStore.set((s) => ({ ...s, messages: [msg, ...s.messages], receivedTotal: s.receivedTotal + 1 }));
    return msg;
  },

  clearAll() {
    mailboxStore.reset();
  },
};
