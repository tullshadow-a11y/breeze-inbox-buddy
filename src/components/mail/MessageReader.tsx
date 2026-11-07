import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, ArrowLeft, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { buildMailDocument, fetchMessage, type MailSession } from "@/lib/tempmail";
import { EmptyState } from "./EmptyState";
import { initials, senderName } from "./InboxList";

interface MessageReaderProps {
  session: MailSession;
  messageId: string;
  onBack: () => void;
  onDelete: (id: string) => void;
}

export function MessageReader({ session, messageId, onBack, onDelete }: MessageReaderProps) {
  const { data, isPending, error } = useQuery({
    queryKey: ["message", session.address, messageId],
    queryFn: () => fetchMessage(session, messageId),
    staleTime: Infinity,
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <Button variant="ghost" size="sm" className="rounded-lg lg:hidden" onClick={onBack}>
          <ArrowLeft /> Inbox
        </Button>
        <span className="hidden text-xs uppercase tracking-[0.2em] text-muted-foreground lg:block">
          Message
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-lg text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(messageId)}
        >
          <Trash2 /> Delete
        </Button>
      </div>

      {error ? (
        <EmptyState
          icon={<AlertTriangle />}
          title="Couldn't open this message"
          description={error instanceof Error ? error.message : "Please try again in a moment."}
        />
      ) : isPending || !data ? (
        <div className="space-y-4 p-6">
          <Skeleton className="h-7 w-2/3 bg-muted" />
          <Skeleton className="h-4 w-1/3 bg-muted" />
          <Skeleton className="mt-6 h-64 w-full rounded-2xl bg-muted" />
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-5 p-5 sm:p-6 animate-fade-up">
          <div>
            <h2 className="text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
              {data.subject}
            </h2>
            <div className="mt-4 flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-primary font-mono text-xs font-bold text-primary-foreground">
                {initials(data.from)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{senderName(data.from)}</p>
                <p className="truncate font-mono text-xs text-muted-foreground">{data.from}</p>
              </div>
              <time className="shrink-0 text-right font-mono text-xs text-muted-foreground">
                {format(data.timestamp, "MMM d")}
                <br />
                {format(data.timestamp, "HH:mm")}
              </time>
            </div>
          </div>
          <div className="flex-1 overflow-hidden rounded-2xl border border-glass-border">
            <iframe
              title={data.subject}
              srcDoc={buildMailDocument(data.bodyHtml)}
              sandbox="allow-popups allow-popups-to-escape-sandbox"
              className="h-full min-h-[420px] w-full bg-card"
            />
          </div>
        </div>
      )}
    </div>
  );
}
