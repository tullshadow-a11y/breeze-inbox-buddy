import { useMemo, useState, type ReactNode } from "react";
import { ArrowDownWideNarrow, MailOpen, Search, SearchX, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useHydrated } from "@tanstack/react-router";
import { queryMailbox, type QuickFilter, type SortOrder, type ViewId } from "@/lib/mailbox";
import { cn } from "@/lib/utils";
import { mailbox, useMailbox } from "@/stores/mailbox";
import { useCompose } from "./ComposeDialog";
import { EmptyState } from "./EmptyState";
import { MessageList } from "./MessageList";
import { MessageReader } from "./MessageReader";

const FILTERS: { id: QuickFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "starred", label: "Starred" },
  { id: "attachments", label: "Attachments" },
  { id: "encrypted", label: "Encrypted" },
];

const SORTS: { id: SortOrder; label: string }[] = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "sender", label: "Sender A–Z" },
  { id: "subject", label: "Subject A–Z" },
];

interface MailboxViewProps {
  view: ViewId;
  title: string;
  icon: ReactNode;
  empty: { icon: ReactNode; title: string; description: string; pulse?: boolean; action?: ReactNode };
  /** Extra state shown above the list (e.g. the inbox's connection problems). */
  notice?: ReactNode;
  loading?: boolean;
}

export function MailboxView({ view, title, icon, empty, notice, loading }: MailboxViewProps) {
  const hydrated = useHydrated();
  const { messages } = useMailbox();
  const { openCompose } = useCompose();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<QuickFilter>("all");
  const [sort, setSort] = useState<SortOrder>("newest");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const total = useMemo(() => queryMailbox(messages, { view }).length, [messages, view]);
  const list = useMemo(
    () => queryMailbox(messages, { view, query, filter, sort }),
    [messages, view, query, filter, sort],
  );
  const unread = useMemo(() => list.filter((m) => !m.read).length, [list]);
  const selected = selectedId ? messages.find((m) => m.id === selectedId && list.includes(m)) : undefined;
  const searching = query.trim() !== "" || filter !== "all";
  const isDrafts = view === "drafts";
  const showRecipient = view === "sent" || view === "drafts";

  return (
    <section className="glass overflow-hidden rounded-3xl">
      <div className="flex flex-col gap-3 border-b border-border p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 basis-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${title.toLowerCase()}…`}
              aria-label={`Search ${title}`}
              className="h-10 rounded-xl pl-9 pr-9"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as SortOrder)}>
            <SelectTrigger className="h-10 w-auto gap-2 rounded-xl" aria-label="Sort messages">
              <ArrowDownWideNarrow className="size-4 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {SORTS.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {view === "trash" && total > 0 && <EmptyTrashButton count={total} />}
        </div>
        <div className="scrollbar-thin -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5" role="group" aria-label="Filter">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filter === f.id
                  ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {notice}

      <div className="grid min-h-[520px] lg:grid-cols-[minmax(320px,400px)_1fr]">
        <div className={cn("flex min-w-0 flex-col border-border lg:border-r", selected && "hidden lg:flex")}>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2 [&_svg]:size-4 [&_svg]:text-primary">
              {icon}
              <span className="text-sm font-medium">{title}</span>
              {hydrated && list.length > 0 && (
                <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                  {searching ? `${list.length}/${total}` : list.length}
                </span>
              )}
            </div>
            {unread > 0 && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                {unread} unread
              </span>
            )}
          </div>
          <div className="scrollbar-thin flex-1 overflow-y-auto lg:max-h-[680px]">
            {!hydrated || (loading && total === 0) ? (
              <ListSkeleton />
            ) : list.length === 0 && total > 0 ? (
              <EmptyState
                icon={<SearchX />}
                title="No matches"
                description="Nothing here matches your search or filter. Try different words or clear the filter."
                action={
                  <Button
                    variant="glass"
                    className="rounded-xl"
                    onClick={() => {
                      setQuery("");
                      setFilter("all");
                    }}
                  >
                    Clear search
                  </Button>
                }
              />
            ) : list.length === 0 ? (
              <EmptyState {...empty} />
            ) : (
              <MessageList
                messages={list}
                selectedId={selected?.id ?? null}
                showRecipient={showRecipient}
                onSelect={(m) => (isDrafts ? openCompose(m.id) : setSelectedId(m.id))}
              />
            )}
          </div>
        </div>

        <div className={cn("min-w-0", !selected && "hidden lg:block")}>
          {selected ? (
            <MessageReader
              key={selected.id}
              message={selected}
              onBack={() => setSelectedId(null)}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <EmptyState
              icon={<MailOpen />}
              title={isDrafts ? "Pick up where you left off" : list.length ? "Select a message" : "Nothing to read yet"}
              description={
                isDrafts
                  ? "Choose a draft to keep writing. Drafts save automatically as you type."
                  : list.length
                    ? "Choose a message from the list to read its full content here."
                    : "Messages open here with sender, subject, time and full content."
              }
            />
          )}
        </div>
      </div>
    </section>
  );
}

function EmptyTrashButton({ count }: { count: number }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="glass-danger" className="h-10 rounded-xl">
          <Trash2 /> Empty trash
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="glass rounded-2xl border-glass-border bg-popover/80">
        <AlertDialogHeader>
          <AlertDialogTitle>Empty the trash?</AlertDialogTitle>
          <AlertDialogDescription>
            {count === 1 ? "1 message" : `${count} messages`} will be deleted forever. This can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              mailbox.emptyTrash();
              toast.success("Trash emptied");
            }}
          >
            Empty trash
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ListSkeleton() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-3 px-4 py-4">
          <Skeleton className="size-10 rounded-xl bg-muted" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2 bg-muted" />
            <Skeleton className="h-3 w-4/5 bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
