/**
 * Local mailbox model. Every message the app knows about — mail received on the
 * temporary address, internal notes, drafts — lives here and is persisted on the
 * device, so folders, stars and drafts survive reloads and address expiry.
 */

export type Folder = "inbox" | "sent" | "drafts" | "archive" | "trash";

export interface StoredMessage {
  id: string;
  source: "remote" | "local";
  /** Provider id for remote mail, used to fetch the body / delete upstream. */
  remoteId?: string;
  /** Temporary address the message was received on (remote mail and internal deliveries). */
  address?: string;
  folder: Folder;
  /** Folder to return to when restored from trash. */
  prevFolder?: Folder;
  from: string;
  to: string;
  subject: string;
  excerpt: string;
  /** HTML for remote mail, plain text for local notes, ciphertext when encrypted. */
  body?: string;
  bodyFormat: "html" | "text";
  timestamp: number;
  read: boolean;
  starred: boolean;
  encrypted: boolean;
  hasAttachments: boolean;
}

export interface MailboxState {
  messages: StoredMessage[];
  /** Permanently deleted remote messages, so polling doesn't bring them back. */
  tombstones: string[];
  /** Lifetime count of messages that arrived in the inbox. */
  receivedTotal: number;
}

export const EMPTY_MAILBOX: MailboxState = { messages: [], tombstones: [], receivedTotal: 0 };

export const remoteKey = (address: string, remoteId: string) => `gm:${address}:${remoteId}`;

// ---------- folder moves ----------

export function moveTo(m: StoredMessage, folder: Folder): StoredMessage {
  if (m.folder === folder) return m;
  return {
    ...m,
    folder,
    prevFolder: folder === "trash" ? m.folder : undefined,
  };
}

export function restore(m: StoredMessage): StoredMessage {
  if (m.folder !== "trash") return m;
  return { ...m, folder: m.prevFolder ?? "inbox", prevFolder: undefined };
}

// ---------- views ----------

export type ViewId = "inbox" | "sent" | "drafts" | "saved" | "archive" | "trash";

/** Which messages a sidebar view shows. "Saved" is every starred message outside the trash. */
export function inView(m: StoredMessage, view: ViewId) {
  if (view === "saved") return m.starred && m.folder !== "trash";
  return m.folder === view;
}

export type QuickFilter = "all" | "unread" | "starred" | "attachments" | "encrypted";
export type SortOrder = "newest" | "oldest" | "sender" | "subject";

export function matchesQuery(m: StoredMessage, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [m.from, m.to, m.subject, m.excerpt, m.encrypted ? "" : stripHtml(m.body ?? "")]
    .join("\n")
    .toLowerCase();
  return q.split(/\s+/).every((term) => haystack.includes(term));
}

export function matchesFilter(m: StoredMessage, filter: QuickFilter) {
  switch (filter) {
    case "unread":
      return !m.read;
    case "starred":
      return m.starred;
    case "attachments":
      return m.hasAttachments;
    case "encrypted":
      return m.encrypted;
    default:
      return true;
  }
}

const collator = new Intl.Collator(undefined, { sensitivity: "base" });

export function sortMessages(list: StoredMessage[], order: SortOrder) {
  const copy = [...list];
  switch (order) {
    case "oldest":
      return copy.sort((a, b) => a.timestamp - b.timestamp);
    case "sender":
      return copy.sort((a, b) => collator.compare(senderName(a.from), senderName(b.from)) || b.timestamp - a.timestamp);
    case "subject":
      return copy.sort((a, b) => collator.compare(a.subject, b.subject) || b.timestamp - a.timestamp);
    default:
      return copy.sort((a, b) => b.timestamp - a.timestamp);
  }
}

export function queryMailbox(
  messages: StoredMessage[],
  opts: { view: ViewId; query?: string; filter?: QuickFilter; sort?: SortOrder },
) {
  const list = messages.filter(
    (m) => inView(m, opts.view) && matchesFilter(m, opts.filter ?? "all") && matchesQuery(m, opts.query ?? ""),
  );
  return sortMessages(list, opts.sort ?? "newest");
}

// ---------- text helpers ----------

export function senderName(from: string) {
  const match = from.match(/^\s*"?([^"<]+?)"?\s*<.+>$/);
  return (match?.[1] ?? from).trim();
}

export function initials(from: string) {
  const name = senderName(from).replace(/@.*/, "");
  const parts = name.split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function stripHtml(html: string) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export function makeExcerpt(text: string, max = 140) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

// ---------- export ----------

const CSV_COLUMNS = [
  "id",
  "folder",
  "source",
  "from",
  "to",
  "subject",
  "date",
  "read",
  "starred",
  "encrypted",
  "attachments",
  "body",
] as const;

export function csvCell(value: string) {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCSV(messages: StoredMessage[]) {
  const rows = messages.map((m) =>
    [
      m.id,
      m.folder,
      m.source,
      m.from,
      m.to,
      m.subject,
      new Date(m.timestamp).toISOString(),
      String(m.read),
      String(m.starred),
      String(m.encrypted),
      String(m.hasAttachments),
      m.encrypted ? (m.body ?? "") : m.bodyFormat === "html" ? stripHtml(m.body ?? "") : (m.body ?? ""),
    ]
      .map(csvCell)
      .join(","),
  );
  return [CSV_COLUMNS.join(","), ...rows].join("\r\n");
}

export function toJSON(messages: StoredMessage[]) {
  return JSON.stringify(
    { app: "Umbra Mail", exportedAt: new Date().toISOString(), count: messages.length, messages },
    null,
    2,
  );
}

// ---------- storage health ----------

/** Browsers typically allow ~5 MB of localStorage per site. */
export const STORAGE_QUOTA_BYTES = 5 * 1024 * 1024;

export type StorageHealth = "healthy" | "filling" | "critical";

export function storageHealth(usedBytes: number, quota = STORAGE_QUOTA_BYTES): StorageHealth {
  const ratio = usedBytes / quota;
  if (ratio >= 0.85) return "critical";
  if (ratio >= 0.6) return "filling";
  return "healthy";
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
