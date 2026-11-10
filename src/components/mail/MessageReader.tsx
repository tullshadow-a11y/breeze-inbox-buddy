import { useEffect, useState, type ReactNode } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Inbox,
  Loader2,
  Lock,
  RotateCcw,
  Star,
  Trash2,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useMailSession } from "@/components/providers/MailSessionProvider";
import { decryptText } from "@/lib/crypto";
import { initials, senderName, type StoredMessage } from "@/lib/mailbox";
import { buildMailDocument } from "@/lib/tempmail";
import { cn } from "@/lib/utils";
import { mailbox } from "@/stores/mailbox";
import { EmptyState } from "./EmptyState";

interface MessageReaderProps {
  message: StoredMessage;
  onBack: () => void;
  onClose: () => void;
}

export function MessageReader({ message: m, onBack, onClose }: MessageReaderProps) {
  const { loadBody, destroyMessages } = useMailSession();

  useEffect(() => {
    if (!m.read) mailbox.markRead(m.id);
  }, [m.id, m.read]);

  const act = (fn: () => void, label: string, close = true) => {
    fn();
    toast.success(label);
    if (close) onClose();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <Button variant="ghost" size="sm" className="rounded-lg lg:hidden" onClick={onBack}>
          <ArrowLeft /> Back
        </Button>
        <span className="hidden pl-1 text-xs uppercase tracking-[0.2em] text-muted-foreground lg:block">
          Message
        </span>
        <div className="flex flex-wrap items-center gap-1">
          {m.folder === "trash" ? (
            <>
              <ToolbarButton
                icon={<RotateCcw />}
                label="Restore"
                onClick={() => act(() => mailbox.restore(m.id), "Message restored")}
              />
              <ToolbarButton
                icon={<Trash2 />}
                label="Delete forever"
                danger
                onClick={() => act(() => destroyMessages([m.id]), "Message deleted forever")}
              />
            </>
          ) : (
            <>
              <ToolbarButton
                icon={<Star className={cn(m.starred && "fill-current text-primary")} />}
                label={m.starred ? "Saved" : "Save"}
                onClick={() =>
                  act(() => mailbox.toggleStar(m.id), m.starred ? "Removed from Saved" : "Added to Saved", false)
                }
              />
              {m.folder === "archive" ? (
                <ToolbarButton
                  icon={<ArchiveRestore />}
                  label={m.source === "remote" || m.address ? "Move to inbox" : "Unarchive"}
                  onClick={() =>
                    act(() => mailbox.move(m.id, m.source === "local" && !m.address ? "sent" : "inbox"), "Moved out of Archive")
                  }
                />
              ) : (
                <ToolbarButton
                  icon={<Archive />}
                  label="Archive"
                  onClick={() => act(() => mailbox.move(m.id, "archive"), "Archived")}
                />
              )}
              <ToolbarButton
                icon={<Trash2 />}
                label="Trash"
                danger
                onClick={() => act(() => mailbox.move(m.id, "trash"), "Moved to Trash")}
              />
            </>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 p-5 sm:p-6 animate-fade-up">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <FolderBadge message={m} />
            {m.encrypted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                <Lock className="size-3" /> Encrypted
              </span>
            )}
          </div>
          <h2 className="mt-3 text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
            {m.subject || "(no subject)"}
          </h2>
          <div className="mt-4 flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-primary font-mono text-xs font-bold text-primary-foreground">
              {initials(m.from)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{senderName(m.from)}</p>
              <p className="truncate font-mono text-xs text-muted-foreground">
                {m.from} <span className="text-muted-foreground/70">→</span> {m.to}
              </p>
            </div>
            <time className="shrink-0 text-right font-mono text-xs text-muted-foreground">
              {format(m.timestamp, "MMM d")}
              <br />
              {format(m.timestamp, "HH:mm")}
            </time>
          </div>
        </div>
        {m.encrypted ? (
          <EncryptedBody key={m.id} envelope={m.body ?? ""} />
        ) : m.bodyFormat === "html" ? (
          <RemoteBody message={m} loadBody={loadBody} />
        ) : (
          <TextBody text={m.body ?? ""} />
        )}
      </div>
    </div>
  );
}

function ToolbarButton({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn("rounded-lg text-muted-foreground", danger ? "hover:text-destructive" : "hover:text-foreground")}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      <span className="sr-only sm:hidden">{label}</span>
    </Button>
  );
}

const FOLDER_LABEL = { inbox: "Inbox", sent: "Sent", drafts: "Draft", archive: "Archive", trash: "Trash" } as const;

function FolderBadge({ message }: { message: StoredMessage }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
      {message.folder === "inbox" && <Inbox className="size-3" />}
      {FOLDER_LABEL[message.folder]}
      {message.source === "local" && " · internal"}
    </span>
  );
}

function TextBody({ text }: { text: string }) {
  return (
    <div className="glass-strong flex-1 whitespace-pre-wrap break-words rounded-2xl p-5 text-sm leading-relaxed">
      {text.trim() ? text : <em className="text-muted-foreground">This message has no content.</em>}
    </div>
  );
}

function RemoteBody({
  message,
  loadBody,
}: {
  message: StoredMessage;
  loadBody: (m: StoredMessage) => Promise<string>;
}) {
  const [error, setError] = useState<string | null>(null);
  const body = message.body;

  useEffect(() => {
    if (body !== undefined) return;
    let cancelled = false;
    loadBody(message).catch((e: unknown) => {
      if (!cancelled) setError(e instanceof Error ? e.message : "Couldn't open this message");
    });
    return () => {
      cancelled = true;
    };
  }, [body, message, loadBody]);

  if (error && body === undefined) {
    return (
      <div className="glass-strong rounded-2xl">
        <EmptyState
          icon={<AlertTriangle />}
          title="Full message unavailable"
          description={
            <>
              {error}
              {message.excerpt && <span className="mt-3 block italic">“{message.excerpt}”</span>}
            </>
          }
        />
      </div>
    );
  }
  if (body === undefined) {
    return <Skeleton className="h-64 w-full flex-1 rounded-2xl bg-muted" />;
  }
  return (
    <div className="flex-1 overflow-hidden rounded-2xl border border-glass-border">
      <iframe
        title={message.subject}
        srcDoc={buildMailDocument(body)}
        sandbox="allow-popups allow-popups-to-escape-sandbox"
        className="h-full min-h-[420px] w-full bg-card"
      />
    </div>
  );
}

function EncryptedBody({ envelope }: { envelope: string }) {
  const [pass, setPass] = useState("");
  const [plain, setPlain] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (plain !== null) {
    return (
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-xs text-success">
          <Unlock className="size-3.5" /> Unlocked for this view only
        </p>
        <TextBody text={plain} />
      </div>
    );
  }

  const unlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pass) return;
    setBusy(true);
    setError(null);
    try {
      setPlain(await decryptText(envelope, pass));
    } catch {
      setError("That passphrase doesn't unlock this message.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={unlock} className="glass-strong flex flex-1 flex-col items-center justify-center rounded-2xl px-6 py-12 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary">
        <Lock className="size-6" />
      </div>
      <h3 className="mt-5 text-lg font-semibold tracking-tight">This message is encrypted</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Enter the passphrase it was sent with to read it.
      </p>
      <div className="mt-5 flex w-full max-w-sm gap-2">
        <Input
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          placeholder="Passphrase"
          aria-label="Passphrase"
          autoComplete="off"
          className="rounded-xl"
        />
        <Button type="submit" variant="hero" className="rounded-xl" disabled={!pass || busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Unlock />} Unlock
        </Button>
      </div>
      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
    </form>
  );
}
