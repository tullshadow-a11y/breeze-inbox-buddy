import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";

import { PageHeader } from "@/components/layout/AppShell";
import { MailboxView } from "@/components/mail/MailboxView";

export const Route = createFileRoute("/trash")({
  head: () => ({
    meta: [
      { title: "Trash — Umbra Mail" },
      { name: "description", content: "Deleted messages waiting to be restored or removed for good." },
      { property: "og:title", content: "Trash — Umbra Mail" },
      { property: "og:description", content: "Deleted messages waiting to be restored or removed for good." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrashPage,
});

function TrashPage() {
  
  return (
    <>
      <PageHeader eyebrow="Trash" title="Trash" description="Deleted messages. Restore them, or delete them forever." />
      <MailboxView
        view="trash"
        title="Trash"
        icon={<Trash2 />}
        empty={{
          icon: <Trash2 />,
          title: "Trash is empty",
          description: "Messages you delete will wait here until you empty the trash.",
        }}
      />
    </>
  );
}
