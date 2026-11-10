import { useMemo } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Ghost, PenSquare } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { useCompose } from "@/components/mail/ComposeDialog";
import { useMailSession } from "@/components/providers/MailSessionProvider";
import { formatDuration, useNow } from "@/hooks/use-now";
import { inView, type ViewId } from "@/lib/mailbox";
import { useMailbox } from "@/stores/mailbox";
import { ACCOUNT_NAV, MAILBOX_NAV, type NavItem } from "./nav";

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { messages } = useMailbox();
  const { openCompose } = useCompose();

  const badges = useMemo(() => {
    const out: Partial<Record<ViewId, number>> = {};
    const count = (view: ViewId, pred: (m: (typeof messages)[number]) => boolean = () => true) =>
      messages.filter((m) => inView(m, view) && pred(m)).length;
    out.inbox = count("inbox", (m) => !m.read);
    out.drafts = count("drafts");
    out.saved = count("saved");
    out.trash = count("trash");
    return out;
  }, [messages]);

  const close = () => isMobile && setOpenMobile(false);

  const renderItem = (item: NavItem) => {
    const active = pathname === item.to;
    const badge = item.view ? badges[item.view] : undefined;
    return (
      <SidebarMenuItem key={item.to}>
        <SidebarMenuButton asChild isActive={active} tooltip={item.label} className="h-10 rounded-xl">
          <Link to={item.to} onClick={close}>
            <item.icon className={active ? "text-primary" : undefined} />
            <span>{item.label}</span>
          </Link>
        </SidebarMenuButton>
        {!!badge && (
          <SidebarMenuBadge
            className={
              item.view === "inbox"
                ? "rounded-full bg-primary/15 font-mono text-primary"
                : "font-mono text-muted-foreground"
            }
          >
            {badge}
          </SidebarMenuBadge>
        )}
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-sidebar-border [&_[data-sidebar=sidebar]]:backdrop-blur-2xl"
    >
      <SidebarHeader className="gap-4 p-3">
        <Link to="/" onClick={close} className="flex items-center gap-2.5 px-1 pt-1">
          <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
            <Ghost className="size-4.5" />
          </div>
          {!collapsed && <span className="truncate text-base font-semibold tracking-tight">Umbra Mail</span>}
        </Link>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Compose"
              onClick={() => {
                close();
                openCompose();
              }}
              className="h-10 justify-center rounded-xl bg-gradient-primary font-semibold text-primary-foreground shadow-glow hover:text-primary-foreground hover:brightness-110 active:text-primary-foreground"
            >
              <PenSquare />
              <span>Compose</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase tracking-[0.18em]">Mailboxes</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">{MAILBOX_NAV.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase tracking-[0.18em]">Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{ACCOUNT_NAV.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">{!collapsed && <SessionCard />}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function SessionCard() {
  const { session, status } = useMailSession();
  const now = useNow(1000, !!session);
  return (
    <div className="glass-strong rounded-2xl p-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        <span className="relative flex size-2">
          {session && (
            <span className="absolute inline-flex size-full rounded-full bg-success opacity-75 animate-ping" />
          )}
          <span
            className={`relative inline-flex size-2 rounded-full ${session ? "bg-success" : "bg-muted-foreground"}`}
          />
        </span>
        {session ? "Live session" : status === "booting" ? "Connecting…" : "No address"}
      </div>
      {session && (
        <>
          <p className="mt-2 truncate font-mono text-xs text-foreground" title={session.address}>
            {session.address}
          </p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            Uptime {formatDuration(now - session.createdAt)}
          </p>
        </>
      )}
    </div>
  );
}
