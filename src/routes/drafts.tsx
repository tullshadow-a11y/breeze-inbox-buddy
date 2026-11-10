import { createFileRoute } from "@tanstack/react-router";
import { NotebookPen, PenSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/AppShell";
import { useCompose } from "@/components/mail/ComposeDialog";
import { MailboxView } from "@/components/mail/MailboxView";

export const Route = createFileRoute("/drafts")({
  head: () => ({
    meta: [
      { title: "Drafts — Umbra Mail" },
      { name: "description", content: "Your unsent Umbra Mail drafts, saved on this device." },
      { property: "og:title", content: "Drafts — Umbra Mail" },
      { property: "og:description", content: "Your unsent Umbra Mail drafts, saved on this device." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DraftsPage,
});

function DraftsPage() {
  const { openCompose } = useCompose();
  return (
    <>
      <PageHeader eyebrow="Drafts" title="Drafts" description="Unsent messages, saved automatically as you type." />
      <MailboxView
        view="drafts"
        title="Drafts"
        icon={<NotebookPen />}
        empty={{
          icon: <NotebookPen />,
          title: "No drafts",
          description: "Start writing with Compose — your draft saves automatically.",
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
