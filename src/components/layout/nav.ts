import { Archive, Inbox, NotebookPen, Send, Settings, Star, Trash2, type LucideIcon } from "lucide-react";

import type { ViewId } from "@/lib/mailbox";

export interface NavItem {
  to: "/" | "/sent" | "/drafts" | "/saved" | "/archive" | "/trash" | "/settings";
  label: string;
  icon: LucideIcon;
  view?: ViewId;
}

export const MAILBOX_NAV: NavItem[] = [
  { to: "/", label: "Inbox", icon: Inbox, view: "inbox" },
  { to: "/sent", label: "Sent", icon: Send, view: "sent" },
  { to: "/drafts", label: "Drafts", icon: NotebookPen, view: "drafts" },
  { to: "/saved", label: "Saved", icon: Star, view: "saved" },
  { to: "/archive", label: "Archive", icon: Archive, view: "archive" },
  { to: "/trash", label: "Trash", icon: Trash2, view: "trash" },
];

export const ACCOUNT_NAV: NavItem[] = [{ to: "/settings", label: "Settings", icon: Settings }];
