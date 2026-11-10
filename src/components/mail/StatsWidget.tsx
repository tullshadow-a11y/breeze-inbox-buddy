import { useMemo, type ReactNode } from "react";
import { Activity, Database, Inbox, Star } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { useMailSession } from "@/components/providers/MailSessionProvider";
import { formatDuration, useNow } from "@/hooks/use-now";
import { useStorageUsage } from "@/hooks/use-storage-usage";
import { formatBytes } from "@/lib/mailbox";
import { cn } from "@/lib/utils";
import { useMailbox } from "@/stores/mailbox";

const HEALTH = {
  healthy: { label: "Healthy", className: "text-success" },
  filling: { label: "Filling up", className: "text-primary" },
  critical: { label: "Almost full", className: "text-destructive" },
} as const;

export function StatsWidget({ className }: { className?: string }) {
  const { session } = useMailSession();
  const { messages, receivedTotal } = useMailbox();
  const now = useNow(1000, !!session);
  const storage = useStorageUsage();

  const counts = useMemo(() => {
    let inbox = 0;
    let unread = 0;
    let saved = 0;
    for (const m of messages) {
      if (m.folder === "inbox") {
        inbox++;
        if (!m.read) unread++;
      }
      if (m.starred && m.folder !== "trash") saved++;
    }
    return { inbox, unread, saved, total: messages.length };
  }, [messages]);

  const health = HEALTH[storage.health];

  return (
    <section aria-label="Activity summary" className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>
      <StatCard
        icon={<Inbox />}
        label="Total received"
        value={receivedTotal.toLocaleString()}
        hint={`${counts.inbox} in inbox · ${counts.unread} unread`}
      />
      <StatCard
        icon={<Activity />}
        label="Session"
        value={session ? formatDuration(now - session.createdAt) : "—"}
        mono
        hint={session ? "Active address uptime" : "No active address"}
      />
      <StatCard
        icon={<Star />}
        label="Saved"
        value={counts.saved.toLocaleString()}
        hint={`${counts.total} stored messages`}
      />
      <StatCard
        icon={<Database />}
        label="Storage"
        value={formatBytes(storage.used)}
        mono
        hint={
          <span className="flex items-center gap-1.5">
            <span className={cn("font-medium", health.className)}>{health.label}</span>·{" "}
            {(storage.ratio * 100).toFixed(storage.ratio < 0.01 ? 2 : 0)}% of {formatBytes(storage.quota)}
          </span>
        }
      >
        <Progress value={Math.max(storage.ratio * 100, 1)} className="mt-3 h-1.5 bg-muted" />
      </StatCard>
    </section>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  mono,
  children,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: ReactNode;
  mono?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="glass relative overflow-hidden rounded-2xl p-4 sm:p-5">
      <div className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-primary/10 blur-2xl" />
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        <span className="grid size-7 place-items-center rounded-lg bg-primary/15 text-primary [&_svg]:size-3.5">
          {icon}
        </span>
        {label}
      </div>
      <p className={cn("mt-3 truncate text-2xl font-semibold tracking-tight tabular-nums", mono && "font-mono")}>
        {value}
      </p>
      <div className="mt-1 truncate text-xs text-muted-foreground">{hint}</div>
      {children}
    </div>
  );
}
