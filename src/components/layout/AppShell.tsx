import { useEffect, useState, type ReactNode } from "react";
import { Check, Copy, PenSquare } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useCompose } from "@/components/mail/ComposeDialog";
import { useMailSession } from "@/components/providers/MailSessionProvider";
import { useSettings } from "@/stores/settings";
import { AppSidebar } from "./AppSidebar";

/** Keeps <html data-theme / data-accent> in sync with saved settings. */
function ThemeSync() {
  const { theme, accent } = useSettings();
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.theme = theme;
    el.dataset.accent = accent;
  }, [theme, accent]);
  return null;
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <ThemeSync />
      <div className="aurora">
        <div className="absolute -left-40 top-10 size-[520px] rounded-full bg-primary/10 blur-[120px] animate-drift" />
        <div
          className="absolute -right-40 top-1/3 size-[480px] rounded-full bg-primary-glow/10 blur-[120px] animate-drift"
          style={{ animationDelay: "-8s" }}
        />
      </div>
      <div className="grid-overlay pointer-events-none fixed inset-0 z-0" />

      <div className="relative z-10 flex min-h-svh w-full">
        <AppSidebar />
        <SidebarInset className="min-w-0 bg-transparent">
          <TopBar />
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-10 sm:px-6">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function TopBar() {
  const { session } = useMailSession();
  const { openCompose } = useCompose();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!session) return;
    try {
      await navigator.clipboard.writeText(session.address);
      setCopied(true);
      toast.success("Address copied to clipboard");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't access the clipboard");
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/40 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4 sm:px-6">
        <SidebarTrigger className="size-9 rounded-xl" />
        <div className="flex-1" />
        {session && (
          <button
            type="button"
            onClick={copy}
            className="glass-strong hidden max-w-[22rem] items-center gap-2 rounded-xl px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground sm:flex"
            aria-label="Copy your address"
          >
            <span className="truncate">{session.address}</span>
            {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
          </button>
        )}
        <Button variant="hero" size="sm" className="h-9 rounded-xl" onClick={() => openCompose()}>
          <PenSquare /> <span className="hidden sm:inline">Compose</span>
          <span className="sr-only sm:hidden">Compose</span>
        </Button>
      </div>
    </header>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 pb-6 pt-8 sm:flex-row sm:items-end sm:justify-between sm:pt-10">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">{description}</p>
      </div>
      {actions}
    </div>
  );
}
