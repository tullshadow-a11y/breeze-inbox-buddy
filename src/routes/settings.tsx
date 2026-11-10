import type { ReactNode } from "react";
import { createFileRoute, useHydrated } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  Bell,
  Braces,
  Check,
  Database,
  FileSpreadsheet,
  Moon,
  Palette,
  RefreshCw,
  RotateCcw,
  Sun,
  Trash2,
  UserRound,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/layout/AppShell";
import { StatsWidget } from "@/components/mail/StatsWidget";
import { useMailSession } from "@/components/providers/MailSessionProvider";
import { downloadFile } from "@/lib/download";
import { toCSV, toJSON } from "@/lib/mailbox";
import { ACCENTS, REFRESH_OPTIONS, type Accent, type ThemeMode } from "@/lib/settings";
import { playChime } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { mailbox, useMailbox } from "@/stores/mailbox";
import { settingsStore, updateSettings, useSettings } from "@/stores/settings";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Umbra Mail" },
      {
        name: "description",
        content:
          "Choose how often Umbra Mail checks for mail, set sounds and themes, and export your stored messages as JSON or CSV.",
      },
      { property: "og:title", content: "Settings — Umbra Mail" },
      {
        property: "og:description",
        content: "Refresh interval, notifications, glass themes and data export for your disposable inbox.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const hydrated = useHydrated();
  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Everything is saved on this device only — nothing is sent to a server."
      />
      <div className={cn("space-y-6", !hydrated && "pointer-events-none opacity-60")}>
        <AccountSection />
        <div className="grid gap-6 lg:grid-cols-2">
          <RefreshSection />
          <AppearanceSection />
        </div>
        <DataSection />
      </div>
    </>
  );
}

function Section({
  icon,
  title,
  description,
  children,
  className,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("glass rounded-3xl p-5 sm:p-6", className)}>
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary [&_svg]:size-4.5">
          {icon}
        </div>
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function Row({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <Label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </Label>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function AccountSection() {
  const settings = useSettings();
  const { session } = useMailSession();
  return (
    <Section icon={<UserRound />} title="Account" description="Your current address and how your messages are signed.">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="glass-strong rounded-2xl p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Current address</p>
          <p className="mt-1.5 truncate font-mono text-sm" title={session?.address}>
            {session?.address ?? "No active address"}
          </p>
        </div>
        <div className="glass-strong rounded-2xl p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Created</p>
          <p className="mt-1.5 font-mono text-sm">
            {session ? format(session.createdAt, "MMM d, yyyy · HH:mm") : "—"}
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="display-name">Display name</Label>
          <Input
            id="display-name"
            value={settings.displayName}
            onChange={(e) => updateSettings({ displayName: e.target.value })}
            placeholder="You"
            maxLength={60}
            className="rounded-xl"
          />
          <p className="text-xs text-muted-foreground">Shown as the sender of messages you write.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="signature">Signature</Label>
          <Textarea
            id="signature"
            value={settings.signature}
            onChange={(e) => updateSettings({ signature: e.target.value })}
            placeholder="Added to the end of new messages"
            maxLength={300}
            className="min-h-[76px] rounded-xl"
          />
        </div>
      </div>
    </Section>
  );
}

function RefreshSection() {
  const settings = useSettings();
  return (
    <Section icon={<Bell />} title="Inbox & notifications" description="How often to check for mail and how to tell you.">
      <div>
        <div className="flex items-center gap-2 text-sm font-medium">
          <RefreshCw className="size-4 text-muted-foreground" /> Auto-refresh
        </div>
        <div className="mt-3 grid grid-cols-5 gap-1.5 rounded-2xl bg-muted p-1" role="radiogroup" aria-label="Auto-refresh interval">
          {REFRESH_OPTIONS.map((s) => {
            const active = settings.refreshInterval === s;
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => updateSettings({ refreshInterval: s })}
                className={cn(
                  "rounded-xl py-2 font-mono text-xs transition-colors",
                  active ? "bg-gradient-primary font-semibold text-primary-foreground shadow-glow" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {s === 0 ? "Off" : `${s}s`}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {settings.refreshInterval === 0
            ? "Mail is only checked when you press Refresh."
            : `Checks for new mail every ${settings.refreshInterval} seconds while this tab is open.`}
        </p>
      </div>
      <Row label="Notification sound" hint="A soft chime when new mail arrives." htmlFor="sound">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg text-muted-foreground"
            onClick={playChime}
            aria-label="Play test sound"
          >
            <Volume2 />
          </Button>
          <Switch id="sound" checked={settings.sound} onCheckedChange={(v) => updateSettings({ sound: v })} />
        </div>
      </Row>
      <Row label="Pop-up alerts" hint="Show a small alert with the sender and subject." htmlFor="popups">
        <Switch id="popups" checked={settings.popups} onCheckedChange={(v) => updateSettings({ popups: v })} />
      </Row>
    </Section>
  );
}

const THEMES: { id: ThemeMode; label: string; icon: ReactNode }[] = [
  { id: "dark", label: "Dark glass", icon: <Moon /> },
  { id: "light", label: "Light glass", icon: <Sun /> },
];

function AppearanceSection() {
  const settings = useSettings();
  return (
    <Section icon={<Palette />} title="Appearance" description="Pick a glass theme and accent color.">
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Theme">
        {THEMES.map((t) => {
          const active = settings.theme === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => updateSettings({ theme: t.id })}
              className={cn(
                "glass-strong flex items-center gap-3 rounded-2xl p-4 text-left text-sm transition-colors [&_svg]:size-4",
                active ? "ring-2 ring-primary" : "hover:bg-accent",
              )}
            >
              <span className={cn("grid size-8 place-items-center rounded-lg", active ? "bg-primary/15 text-primary" : "bg-muted")}>
                {t.icon}
              </span>
              <span className="font-medium">{t.label}</span>
            </button>
          );
        })}
      </div>
      <div>
        <p className="text-sm font-medium">Accent</p>
        <div className="mt-3 flex flex-wrap gap-2.5" role="radiogroup" aria-label="Accent color">
          {(Object.keys(ACCENTS) as Accent[]).map((a) => {
            const active = settings.accent === a;
            return (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={ACCENTS[a].label}
                title={ACCENTS[a].label}
                onClick={() => updateSettings({ accent: a })}
                data-accent-swatch={a}
                className={cn(
                  "grid size-10 place-items-center rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-105",
                  active && "ring-2 ring-foreground/70",
                )}
                style={{
                  background: `linear-gradient(135deg, oklch(0.78 0.15 ${ACCENTS[a].hue}), oklch(0.7 0.14 ${ACCENTS[a].hue + 43}))`,
                }}
              >
                {active && <Check className="size-4 text-background" />}
              </button>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

function DataSection() {
  const { messages } = useMailbox();
  const { destroyMessages } = useMailSession();
  const stamp = () => format(new Date(), "yyyy-MM-dd-HHmm");
  const trashIds = messages.filter((m) => m.folder === "trash").map((m) => m.id);

  const exportAs = (kind: "json" | "csv") => {
    if (!messages.length) {
      toast("There are no stored messages to export yet");
      return;
    }
    if (kind === "json") downloadFile(`umbra-mail-${stamp()}.json`, toJSON(messages), "application/json");
    else downloadFile(`umbra-mail-${stamp()}.csv`, toCSV(messages), "text/csv;charset=utf-8");
    toast.success(`Exported ${messages.length} messages as ${kind.toUpperCase()}`);
  };

  return (
    <Section icon={<Database />} title="Data & storage" description="Usage, exports and cleanup for what this device stores.">
      <StatsWidget />
      <div className="flex flex-wrap gap-2">
        <Button variant="glass" className="rounded-xl" onClick={() => exportAs("json")}>
          <Braces /> Export JSON
        </Button>
        <Button variant="glass" className="rounded-xl" onClick={() => exportAs("csv")}>
          <FileSpreadsheet /> Export CSV
        </Button>
        <Button
          variant="glass"
          className="rounded-xl"
          disabled={!trashIds.length}
          onClick={() => {
            destroyMessages(trashIds);
            toast.success("Trash emptied");
          }}
        >
          <Trash2 /> Empty trash{trashIds.length ? ` (${trashIds.length})` : ""}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Exports include every folder. Encrypted messages stay encrypted in the file.
      </p>

      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
        <p className="text-sm font-medium text-destructive">Danger zone</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Confirm
            trigger={
              <Button variant="glass" className="rounded-xl">
                <RotateCcw /> Reset settings
              </Button>
            }
            title="Reset all settings?"
            description="Refresh interval, sounds, theme, display name and signature go back to their defaults."
            confirm="Reset settings"
            onConfirm={() => {
              settingsStore.reset();
              toast.success("Settings reset");
            }}
          />
          <Confirm
            trigger={
              <Button variant="glass-danger" className="rounded-xl" disabled={!messages.length}>
                <Trash2 /> Delete all stored messages
              </Button>
            }
            title="Delete every stored message?"
            description={`All ${messages.length} messages, drafts and saved items on this device will be removed. Mail still on your current address may download again on the next check.`}
            confirm="Delete everything"
            onConfirm={() => {
              mailbox.clearAll();
              toast.success("Stored messages deleted");
            }}
          />
        </div>
      </div>
    </Section>
  );
}

function Confirm({
  trigger,
  title,
  description,
  confirm,
  onConfirm,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  confirm: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="glass rounded-2xl border-glass-border bg-popover/80">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            {confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
