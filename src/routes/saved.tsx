import { createFileRoute } from "@tanstack/react-router";
import { Star } from "lucide-react";

import { PageHeader } from "@/components/layout/AppShell";
import { MailboxView } from "@/components/mail/MailboxView";

export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      { title: "Saved messages — Umbra Mail" },
      { name: "description", content: "Starred emails and notes kept on this device." },
      { property: "og:title", content: "Saved messages — Umbra Mail" },
      { property: "og:description", content: "Starred emails and notes kept on this device." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SavedPage,
});

function SavedPage() {
  
  return (
    <>
      <PageHeader eyebrow="Saved" title="Saved messages" description="Starred messages from every folder, kept even after your address expires." />
      <MailboxView
        view="saved"
        title="Saved"
        icon={<Star />}
        empty={{
          icon: <Star />,
          title: "No saved messages",
          description: "Tap the star on any message to keep it here.",
        }}
      />
    </>
  );
}
