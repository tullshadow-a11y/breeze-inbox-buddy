import { createFileRoute } from "@tanstack/react-router";
import { Archive } from "lucide-react";

import { PageHeader } from "@/components/layout/AppShell";
import { MailboxView } from "@/components/mail/MailboxView";

export const Route = createFileRoute("/archive")({
  head: () => ({
    meta: [
      { title: "Archive — Umbra Mail" },
      { name: "description", content: "Archived emails and notes, stored on this device." },
      { property: "og:title", content: "Archive — Umbra Mail" },
      { property: "og:description", content: "Archived emails and notes, stored on this device." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ArchivePage,
});

function ArchivePage() {
  
  return (
    <>
      <PageHeader eyebrow="Archive" title="Archive" description="Messages you've filed away. Out of the inbox, never lost." />
      <MailboxView
        view="archive"
        title="Archive"
        icon={<Archive />}
        empty={{
          icon: <Archive />,
          title: "Archive is empty",
          description: "Archive messages to clear your inbox without deleting them.",
        }}
      />
    </>
  );
}
