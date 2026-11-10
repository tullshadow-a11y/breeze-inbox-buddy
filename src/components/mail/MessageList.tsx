import { formatDistanceToNowStrict } from "date-fns";
import { Lock, NotebookPen, Paperclip, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { initials, senderName, type StoredMessage } from "@/lib/mailbox";
import { mailbox } from "@/stores/mailbox";

interface MessageListProps {
  messages: StoredMessage[];
  selectedId: string | null;
  onSelect: (m: StoredMessage) => void;
  /** Show the recipient instead of the sender (Sent, Drafts). */
  showRecipient?: boolean;
}

export function MessageList({ messages, selectedId, onSelect, showRecipient }: MessageListProps) {
  return (
    <ul className="divide-y divide-border">
      {messages.map((m) => {
        const active = m.id === selectedId;
        const who = showRecipient ? m.to : m.from;
        return (
          <li key={m.id} className="group relative animate-fade-up">
            <button
              type="button"
              onClick={() => onSelect(m)}
              className={cn(
                "relative flex w-full gap-3 py-4 pl-4 pr-12 text-left transition-colors",
                active ? "bg-accent" : "hover:bg-muted",
              )}
            >
              {active && (
                <span className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-gradient-primary" />
              )}
              <div className="grid size-10 shrink-0 place-items-center rounded-xl glass-strong font-mono text-xs font-semibold text-primary">
                {m.folder === "drafts" ? <NotebookPen className="size-4" /> : initials(who)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span
                    className={cn(
                      "truncate text-sm",
                      m.read ? "text-muted-foreground" : "font-semibold text-foreground",
                    )}
                  >
                    {showRecipient ? `To: ${senderName(who)}` : senderName(who)}
                  </span>
                  <time className="shrink-0 font-mono text-[11px] text-muted-foreground">
                    {formatDistanceToNowStrict(m.timestamp, { addSuffix: true })}
                  </time>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  {!m.read && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                  <p className="truncate text-sm text-foreground/90">{m.subject || "(no subject)"}</p>
                  {m.encrypted && <Lock className="size-3.5 shrink-0 text-primary" />}
                  {m.hasAttachments && <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />}
                </div>
                {m.excerpt && (
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {m.excerpt}
                  </p>
                )}
              </div>
            </button>
            <button
              type="button"
              onClick={() => mailbox.toggleStar(m.id)}
              aria-label={m.starred ? "Remove from saved" : "Save message"}
              aria-pressed={m.starred}
              className={cn(
                "absolute bottom-3 right-3 grid size-8 place-items-center rounded-lg transition-[opacity,background-color] hover:bg-accent",
                m.starred ? "text-primary" : "text-muted-foreground opacity-60 group-hover:opacity-100",
              )}
            >
              <Star className={cn("size-4", m.starred && "fill-current")} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
