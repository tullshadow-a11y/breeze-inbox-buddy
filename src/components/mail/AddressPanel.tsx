import { useState } from "react";
import { Check, Copy, Loader2, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";

interface AddressPanelProps {
  address: string | null;
  loading: boolean;
  busy: null | "generate" | "delete";
  refreshing: boolean;
  nextCheckIn: number | null;
  onRefresh: () => void;
  onGenerate: () => void;
  onDelete: () => void;
}

export function AddressPanel({
  address,
  loading,
  busy,
  refreshing,
  nextCheckIn,
  onRefresh,
  onGenerate,
  onDelete,
}: AddressPanelProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Address copied to clipboard");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't access the clipboard");
    }
  };

  return (
    <section className="glass relative overflow-hidden rounded-3xl p-5 sm:p-8">
      <div className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-primary/10 blur-3xl" />

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Your temporary address
        </p>
        {address && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full rounded-full bg-success opacity-75 animate-ping" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            <span className="font-mono tabular-nums">
              {refreshing ? "Checking…" : nextCheckIn !== null ? `Next check ${nextCheckIn}s` : "Live"}
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <div className="glass-strong flex min-h-14 flex-1 items-center rounded-2xl px-5">
          {loading ? (
            <Skeleton className="h-6 w-64 bg-muted" />
          ) : address ? (
            <span className="truncate font-mono text-base text-foreground sm:text-xl" title={address}>
              {address}
            </span>
          ) : (
            <span className="font-mono text-base text-muted-foreground">No active address</span>
          )}
        </div>
        <Button
          variant="hero"
          size="lg"
          className="h-14 rounded-2xl px-6 text-base"
          onClick={copy}
          disabled={!address || loading}
          aria-label="Copy address"
        >
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          variant="glass"
          className="h-10 rounded-xl"
          onClick={onRefresh}
          disabled={!address || refreshing}
        >
          <RefreshCw className={refreshing ? "animate-spin" : undefined} />
          Refresh
        </Button>
        <Button
          variant="glass"
          className="h-10 rounded-xl"
          onClick={onGenerate}
          disabled={busy !== null || loading}
        >
          {busy === "generate" ? <Loader2 className="animate-spin" /> : <Sparkles />}
          New address
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="glass-danger"
              className="h-10 rounded-xl"
              disabled={!address || busy !== null}
            >
              {busy === "delete" ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="glass rounded-2xl border-glass-border bg-popover/80">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this address?</AlertDialogTitle>
              <AlertDialogDescription>
                <span className="font-mono text-foreground">{address}</span> and every message in
                its inbox will be discarded. This can't be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Keep it</AlertDialogCancel>
              <AlertDialogAction
                className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={onDelete}
              >
                Delete address
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}
