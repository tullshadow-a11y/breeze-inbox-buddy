import { formatDistanceToNowStrict } from "date-fns";
import { Paperclip } from "lucide-react";

import { cn } from "@/lib/utils";
import type { MailSummary } from "@/lib/tempmail";

interface InboxListProps {
  messages: MailSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function senderName(from: string) {
  const match = from.match(/^\s*"?([^"<]+?)"?\s*<.+>$/);
  return (match?.[1] ?? from).trim();
}

export function initials(from: string) {
  const name = senderName(from).replace(/@.*/, "");
  const parts = name.split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function InboxList({ messages, selectedId, onSelect }: InboxListProps) {
  return (
    <ul className="divide-y divide-border">
      {messages.map((m) => {
        const active = m.id === selectedId;
        return (
          <li key={m.id} className="animate-fade-up">
            <button
              type="button"
              onClick={() => onSelect(m.id)}
              className={cn(
                "group relative flex w-full gap-3 px-4 py-4 text-left transition-colors",
                active ? "bg-accent" : "hover:bg-muted",
              )}
            >
              {active && (
                <span className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-gradient-primary" />
              )}
              <div className="grid size-10 shrink-0 place-items-center rounded-xl glass-strong font-mono text-xs font-semibold text-primary">
                {initials(m.from)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span
                    className={cn(
                      "truncate text-sm",
                      m.read ? "text-muted-foreground" : "font-semibold text-foreground",
                    )}
                  >
                    {senderName(m.from)}
                  </span>
                  <time className="shrink-0 font-mono text-[11px] text-muted-foreground">
                    {formatDistanceToNowStrict(m.timestamp, { addSuffix: true })}
                  </time>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  {!m.read && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                  <p className="truncate text-sm text-foreground/90">{m.subject}</p>
                  {m.hasAttachments && (
                    <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                </div>
                {m.excerpt && (
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {m.excerpt}
                  </p>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
