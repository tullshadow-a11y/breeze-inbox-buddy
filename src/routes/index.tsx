import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Inbox, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/AppShell";
import { AddressPanel } from "@/components/mail/AddressPanel";
import { EmptyState } from "@/components/mail/EmptyState";
import { MailboxView } from "@/components/mail/MailboxView";
import { StatsWidget } from "@/components/mail/StatsWidget";
import { useMailSession } from "@/components/providers/MailSessionProvider";
import { useNow } from "@/hooks/use-now";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Umbra Mail — Instant disposable email inbox" },
      {
        name: "description",
        content:
          "Get a free temporary email address in one click. Receive messages live, save, archive and search them, and delete without a trace.",
      },
      { property: "og:title", content: "Umbra Mail — Instant disposable email inbox" },
      {
        property: "og:description",
        content: "One-click temporary email with a live inbox, saved messages and encrypted notes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InboxPage,
});

function InboxPage() {
  const mail = useMailSession();
  const now = useNow(1000, !!mail.session && mail.intervalMs > 0);
  const nextCheckIn =
    mail.session && mail.intervalMs > 0 && mail.lastChecked
      ? Math.max(0, Math.ceil((mail.lastChecked + mail.intervalMs - now) / 1000))
      : null;

  const handleGenerate = async () => {
    try {
      await mail.generate();
      toast.success("New address ready");
    } catch {
      toast.error("Couldn't create a new address. Please try again.");
    }
  };

  const handleDelete = async () => {
    await mail.destroyAddress();
    toast.success("Address deleted");
  };

  const unreachable = mail.status === "error" && !mail.session;

  return (
    <>
      <PageHeader
        eyebrow="Inbox"
        title={
          <>
            <span className="text-gradient">Disposable inbox.</span> Zero trace.
          </>
        }
        description="A fresh address in one click. Messages land here live — keep your real inbox clean."
      />

      <div className="space-y-6">
        {unreachable ? (
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
        ) : (
          <AddressPanel
            address={mail.session?.address ?? null}
            loading={mail.status === "booting"}
            busy={mail.busy}
            refreshing={mail.refreshing}
            nextCheckIn={nextCheckIn}
            autoRefresh={mail.intervalMs > 0}
            onRefresh={mail.refresh}
            onGenerate={handleGenerate}
            onDelete={handleDelete}
          />
        )}

        <StatsWidget />

        <MailboxView
          view="inbox"
          title="Inbox"
          icon={<Inbox />}
          loading={mail.status === "booting"}
          notice={
            mail.status === "empty" ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted px-4 py-3 text-sm">
                <span className="text-muted-foreground">
                  No active address — new mail can't arrive until you create one.
                </span>
                <Button
                  variant="hero"
                  size="sm"
                  className="rounded-lg"
                  onClick={handleGenerate}
                  disabled={mail.busy !== null}
                >
                  <Plus /> Generate address
                </Button>
              </div>
            ) : null
          }
          empty={{
            pulse: mail.status === "ready",
            icon: <Inbox />,
            title: mail.status === "empty" ? "Inbox is empty" : "Waiting for incoming mail",
            description:
              mail.status === "empty"
                ? "Generate a new address to start receiving mail again."
                : "Send something to your address — it will appear here automatically.",
          }}
        />
      </div>

      <footer className="mt-auto pt-10 text-center text-xs text-muted-foreground">
        Inboxes are public to anyone holding the address — don't use them for anything sensitive.
      </footer>
    </>
  );
}
