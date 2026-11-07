import { useEffect, useRef, useState } from "react";
import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Ghost, Inbox, MailOpen, Plus, ShieldCheck, Timer, Zap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AddressPanel } from "@/components/mail/AddressPanel";
import { EmptyState } from "@/components/mail/EmptyState";
import { InboxList, senderName } from "@/components/mail/InboxList";
import { MessageReader } from "@/components/mail/MessageReader";
import { POLL_INTERVAL_MS, useTempMail } from "@/hooks/use-temp-mail";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Umbra Mail — Instant disposable email inbox" },
      {
        name: "description",
        content:
          "Get a free temporary email address in one click. Receive messages live, copy instantly, and delete without a trace.",
      },
      { property: "og:title", content: "Umbra Mail — Instant disposable email inbox" },
      {
        property: "og:description",
        content: "One-click temporary email with a live inbox. No sign-up, no trace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="aurora">
        <div className="absolute -left-40 top-10 size-[520px] rounded-full bg-primary/10 blur-[120px] animate-drift" />
        <div
          className="absolute -right-40 top-1/3 size-[480px] rounded-full bg-primary-glow/10 blur-[120px] animate-drift"
          style={{ animationDelay: "-8s" }}
        />
      </div>
      <div className="grid-overlay pointer-events-none fixed inset-0 z-0" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 sm:px-6">
        <header className="flex items-center justify-between py-6">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
              <Ghost className="size-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Umbra Mail</span>
          </div>
          <div className="hidden items-center gap-5 text-xs text-muted-foreground sm:flex">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-primary" /> No sign-up
            </span>
            <span className="flex items-center gap-1.5">
              <Timer className="size-3.5 text-primary" /> Auto-expires in 60 min
            </span>
          </div>
        </header>

        <section className="pb-8 pt-6 sm:pt-12">
          <h1 className="max-w-2xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            <span className="text-gradient">Disposable inbox.</span>
            <br />
            Zero trace.
          </h1>
          <p className="mt-4 max-w-lg text-base text-muted-foreground">
            A fresh address in one click. Messages land here live — keep your real inbox clean.
          </p>
        </section>

        <ClientOnly fallback={<AppSkeleton />}>
          <MailApp />
        </ClientOnly>

        <footer className="mt-auto flex flex-col items-center justify-between gap-2 py-8 text-xs text-muted-foreground sm:flex-row">
          <span>Inboxes are public to anyone holding the address — don't use them for anything sensitive.</span>
          <span className="flex items-center gap-1.5">
            <Zap className="size-3.5 text-primary" /> Auto-refresh every {POLL_INTERVAL_MS / 1000}s
          </span>
        </footer>
      </div>
    </div>
  );
}

function AppSkeleton() {
  return (
    <div className="space-y-6">
      <div className="glass rounded-3xl p-8">
        <Skeleton className="h-4 w-40 bg-muted" />
        <Skeleton className="mt-5 h-14 w-full rounded-2xl bg-muted" />
      </div>
      <div className="glass h-[480px] rounded-3xl" />
    </div>
  );
}

function useCountdown(lastUpdated: number, active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  if (!active || !lastUpdated) return null;
  return Math.max(0, Math.ceil((lastUpdated + POLL_INTERVAL_MS - now) / 1000));
}

function MailApp() {
  const mail = useTempMail();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const known = useRef<Set<string> | null>(null);
  const nextCheckIn = useCountdown(mail.lastUpdated, !!mail.session);

  // Reset reader + "seen" tracking whenever the address changes.
  useEffect(() => {
    setSelectedId(null);
    known.current = null;
  }, [mail.session?.address]);

  // Notify about genuinely new arrivals (not the first load).
  useEffect(() => {
    if (mail.inboxLoading) return;
    const ids = new Set(mail.messages.map((m) => m.id));
    if (known.current) {
      const fresh = mail.messages.filter((m) => !known.current!.has(m.id));
      const first = fresh[0];
      if (fresh.length === 1 && first) {
        toast(`New message from ${senderName(first.from)}`, { description: first.subject });
      } else if (fresh.length > 1) {
        toast(`${fresh.length} new messages`);
      }
    }
    known.current = ids;
  }, [mail.messages, mail.inboxLoading]);

  const handleGenerate = async () => {
    try {
      await mail.generate();
      toast.success("New address ready");
    } catch {
      toast.error("Couldn't create a new address. Please try again.");
    }
  };

  const handleDelete = async () => {
    await mail.destroy();
    toast.success("Address deleted");
  };

  const handleDeleteMessage = async (id: string) => {
    setSelectedId(null);
    await mail.removeMessage(id);
    toast.success("Message deleted");
  };

  if (mail.status === "error" && !mail.session) {
    return (
      <div className="glass rounded-3xl">
        <EmptyState
          icon={<AlertTriangle />}
          title="Mail service unreachable"
          description="We couldn't connect to the temporary mail service. Check your connection and try again."
          action={
            <Button variant="hero" className="rounded-xl" onClick={handleGenerate}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  const unread = mail.messages.filter((m) => !m.read).length;

  return (
    <div className="space-y-6">
      <AddressPanel
        address={mail.session?.address ?? null}
        loading={mail.status === "booting"}
        busy={mail.busy}
        refreshing={mail.inboxFetching}
        nextCheckIn={nextCheckIn}
        onRefresh={() => mail.refresh()}
        onGenerate={handleGenerate}
        onDelete={handleDelete}
      />

      <section className="glass overflow-hidden rounded-3xl">
        {mail.status === "empty" ? (
          <EmptyState
            icon={<Plus />}
            title="No active address"
            description="Your previous address and its messages were deleted. Generate a new one to start receiving mail."
            action={
              <Button
                variant="hero"
                className="rounded-xl"
                onClick={handleGenerate}
                disabled={mail.busy !== null}
              >
                Generate address
              </Button>
            }
          />
        ) : (
          <div className="grid min-h-[520px] lg:grid-cols-[380px_1fr]">
            <div
              className={cn(
                "flex flex-col border-border lg:border-r",
                selectedId && "hidden lg:flex",
              )}
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <Inbox className="size-4 text-primary" />
                  <span className="text-sm font-medium">Inbox</span>
                  {mail.messages.length > 0 && (
                    <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                      {mail.messages.length}
                    </span>
                  )}
                </div>
                {unread > 0 && (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                    {unread} unread
                  </span>
                )}
              </div>
              <div className="scrollbar-thin flex-1 overflow-y-auto lg:max-h-[640px]">
                {mail.status === "booting" || mail.inboxLoading ? (
                  <ListSkeleton />
                ) : mail.inboxError && mail.messages.length === 0 ? (
                  <EmptyState
                    icon={<AlertTriangle />}
                    title="Couldn't load inbox"
                    description="The mail service didn't respond. We'll keep retrying automatically."
                  />
                ) : mail.messages.length === 0 ? (
                  <EmptyState
                    pulse
                    icon={<Inbox />}
                    title="Waiting for incoming mail"
                    description="Send something to your address — it will appear here automatically within seconds."
                  />
                ) : (
                  <InboxList
                    messages={mail.messages}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                  />
                )}
              </div>
            </div>

            <div className={cn("min-w-0", !selectedId && "hidden lg:block")}>
              {selectedId && mail.session ? (
                <MessageReader
                  key={selectedId}
                  session={mail.session}
                  messageId={selectedId}
                  onBack={() => setSelectedId(null)}
                  onDelete={handleDeleteMessage}
                />
              ) : (
                <EmptyState
                  icon={<MailOpen />}
                  title={mail.messages.length ? "Select a message" : "Nothing to read yet"}
                  description={
                    mail.messages.length
                      ? "Choose a message from your inbox to read its full content here."
                      : "Messages you receive will open here with sender, subject, time and full content."
                  }
                />
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-3 px-4 py-4">
          <Skeleton className="size-10 rounded-xl bg-muted" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2 bg-muted" />
            <Skeleton className="h-3 w-4/5 bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
