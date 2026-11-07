/**
 * Temporary inbox client backed by the public Guerrilla Mail API.
 * Calls go straight from the browser (the API allows any origin), so rate
 * limits apply per visitor rather than to a shared server.
 */

const API = "https://api.guerrillamail.com/ajax.php";

export interface MailSession {
  address: string;
  sidToken: string;
  createdAt: number;
}

export interface MailSummary {
  id: string;
  from: string;
  subject: string;
  excerpt: string;
  timestamp: number; // ms
  read: boolean;
  hasAttachments: boolean;
}

export interface MailDetail extends MailSummary {
  bodyHtml: string;
}

interface RawMail {
  mail_id: string | number;
  mail_from: string;
  mail_subject: string;
  mail_excerpt?: string;
  mail_timestamp: string | number;
  mail_read: string | number;
  att?: string | number;
  mail_body?: string;
}

async function call<T>(params: Record<string, string>): Promise<T> {
  const url = new URL(API);
  url.searchParams.set("lang", "en");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) throw new Error(`Mail service responded with ${res.status}`);
  return (await res.json()) as T;
}

const decodeEntities = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");

/** The provider drops a canned welcome note into every new inbox; it is not a real incoming message. */
export function isProviderWelcome(m: RawMail) {
  return String(m.mail_id) === "1" || /@guerrillamail\.com$/i.test(m.mail_from ?? "");
}

function toSummary(m: RawMail): MailSummary {
  const ts = Number(m.mail_timestamp);
  return {
    id: String(m.mail_id),
    from: decodeEntities(m.mail_from || "Unknown sender"),
    subject: decodeEntities(m.mail_subject || "(no subject)"),
    excerpt: decodeEntities((m.mail_excerpt ?? "").replace(/\s+/g, " ").trim()),
    timestamp: ts > 0 ? ts * 1000 : Date.now(),
    read: String(m.mail_read) === "1",
    hasAttachments: Number(m.att ?? 0) > 0,
  };
}

export async function createSession(): Promise<MailSession> {
  const r = await call<{ email_addr: string; sid_token: string }>({ f: "get_email_address" });
  if (!r.email_addr || !r.sid_token) throw new Error("Could not create an address");
  return { address: r.email_addr, sidToken: r.sid_token, createdAt: Date.now() };
}

/** Re-attach to an existing session; returns the (possibly refreshed) session. */
export async function resumeSession(s: MailSession): Promise<MailSession> {
  const r = await call<{ email_addr: string; sid_token: string }>({
    f: "get_email_address",
    sid_token: s.sidToken,
  });
  return { ...s, address: r.email_addr || s.address, sidToken: r.sid_token || s.sidToken };
}

export async function listMessages(
  s: MailSession,
): Promise<{ messages: MailSummary[]; sidToken: string }> {
  const r = await call<{ list?: RawMail[]; sid_token?: string }>({
    f: "get_email_list",
    offset: "0",
    sid_token: s.sidToken,
  });
  const messages = (r.list ?? [])
    .filter((m) => !isProviderWelcome(m))
    .map(toSummary)
    .sort((a, b) => b.timestamp - a.timestamp);
  return { messages, sidToken: r.sid_token || s.sidToken };
}

export async function fetchMessage(s: MailSession, id: string): Promise<MailDetail> {
  const r = await call<RawMail>({ f: "fetch_email", email_id: id, sid_token: s.sidToken });
  if (!r || !r.mail_id) throw new Error("Message is no longer available");
  return { ...toSummary(r), bodyHtml: r.mail_body ?? "" };
}

export async function deleteMessage(s: MailSession, id: string) {
  const url = new URL(API);
  url.searchParams.set("f", "del_email");
  url.searchParams.set("sid_token", s.sidToken);
  url.searchParams.append("email_ids[]", id);
  await fetch(url.toString());
}

export async function forgetSession(s: MailSession) {
  try {
    await call({ f: "forget_me", email_addr: s.address, sid_token: s.sidToken });
  } catch {
    // Best effort: the address expires on its own after an hour of inactivity.
  }
}

const STORAGE_KEY = "umbra-mail.session";

export function loadStoredSession(): MailSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as MailSession;
    return s.address && s.sidToken ? s : null;
  } catch {
    return null;
  }
}

export function storeSession(s: MailSession | null) {
  if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  else localStorage.removeItem(STORAGE_KEY);
}

/** Wrap provider HTML in a minimal, dark-friendly document for a sandboxed iframe. */
export function buildMailDocument(bodyHtml: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank">
<style>
  :root { color-scheme: light; }
  body { margin: 0; padding: 24px; font: 15px/1.6 -apple-system, "Segoe UI", system-ui, sans-serif; color: #1a1f2b; background: #ffffff; word-wrap: break-word; }
  img { max-width: 100%; height: auto; }
  pre { white-space: pre-wrap; font: inherit; margin: 0; }
  a { color: #0b7a75; }
  table { max-width: 100%; }
</style></head><body>${bodyHtml || "<p><em>This message has no content.</em></p>"}</body></html>`;
}
