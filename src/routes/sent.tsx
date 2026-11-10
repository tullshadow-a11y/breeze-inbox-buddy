import { createFileRoute } from "@tanstack/react-router";
import { Send, PenSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/AppShell";
import { useCompose } from "@/components/mail/ComposeDialog";
import { MailboxView } from "@/components/mail/MailboxView";

export const Route = createFileRoute("/sent")({
  head: () => ({
    meta: [
      { title: "Sent messages — Umbra Mail" },
      { name: "description", content: "Internal notes and encrypted messages you've sent from your disposable inbox." },
      { property: "og:title", content: "Sent messages — Umbra Mail" },
      { property: "og:description", content: "Internal notes and encrypted messages you've sent from your disposable inbox." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SentPage,
});

function SentPage() {
  const { openCompose } = useCompose();
  return (
    <>
      <PageHeader eyebrow="Sent" title="Sent messages" description="Everything you've written and sent from Umbra Mail." />
      <MailboxView
        view="sent"
        title="Sent"
        icon={<Send />}
        empty={{
          icon: <Send />,
          title: "Nothing sent yet",
          description: "Messages you send with Compose appear here.",
            action: (
              <Button variant="hero" className="rounded-xl" onClick={() => openCompose()}>
                <PenSquare /> Compose
              </Button>
            ),
        }}
      />
    </>
  );
}
