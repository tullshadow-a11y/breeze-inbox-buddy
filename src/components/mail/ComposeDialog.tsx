import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Loader2, Lock, NotebookPen, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useMailSession } from "@/components/providers/MailSessionProvider";
import { encryptText } from "@/lib/crypto";
import { makeExcerpt } from "@/lib/mailbox";
import { mailbox } from "@/stores/mailbox";
import { useSettings } from "@/stores/settings";

/** Internal deliveries land in the inbox after a short, realistic delay. */
export const DELIVERY_DELAY_MS = 1200;

interface ComposeApi {
  openCompose: (draftId?: string) => void;
}

const ComposeCtx = createContext<ComposeApi | null>(null);

export function useCompose() {
  const v = useContext(ComposeCtx);
  if (!v) throw new Error("useCompose must be used inside ComposeProvider");
  return v;
}

export function ComposeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; draftId?: string; nonce: number }>({
    open: false,
    nonce: 0,
  });
  const openCompose = useCallback(
    (draftId?: string) => setState((s) => ({ open: true, draftId, nonce: s.nonce + 1 })),
    [],
  );
  return (
    <ComposeCtx.Provider value={{ openCompose }}>
      {children}
      <Dialog open={state.open} onOpenChange={(open) => setState((s) => ({ ...s, open }))}>
        {state.open && (
          <ComposeForm
            key={state.nonce}
            draftId={state.draftId}
            onDone={() => setState((s) => ({ ...s, open: false }))}
          />
        )}
      </Dialog>
    </ComposeCtx.Provider>
  );
}

function ComposeForm({ draftId: initialDraftId, onDone }: { draftId?: string; onDone: () => void }) {
  const { session, notifyArrival } = useMailSession();
  const settings = useSettings();
  const existing = initialDraftId ? mailbox.get(initialDraftId) : undefined;

  const [draftId, setDraftId] = useState<string | undefined>(existing?.id);
  const [subject, setSubject] = useState(existing?.subject ?? "");
  const [body, setBody] = useState(
    existing?.body ?? (settings.signature ? `\n\n—\n${settings.signature}` : ""),
  );
  const [encrypt, setEncrypt] = useState(existing?.encrypted ?? false);
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">(existing ? "saved" : "idle");
  const [sending, setSending] = useState(false);
  const draftRef = useRef(draftId);
  draftRef.current = draftId;

  const address = session?.address ?? "";
  const from = `${settings.displayName.trim() || "You"} <${address || "local note"}>`;
  const to = address || "Note to self";
  const signatureOnly = settings.signature && body.trim() === `—\n${settings.signature}`.trim();
  const hasContent = !!subject.trim() || (!!body.trim() && !signatureOnly);

  const latest = useRef({ to, subject, body, encrypt, from, hasContent });
  latest.current = { to, subject, body, encrypt, from, hasContent };
  const handled = useRef(false);

  const flushDraft = useCallback(() => {
    const v = latest.current;
    if (!v.hasContent) return draftRef.current;
    const id = mailbox.saveDraft({
      id: draftRef.current,
      to: v.to,
      subject: v.subject,
      body: v.body,
      encrypted: v.encrypt,
      from: v.from,
    });
    draftRef.current = id;
    return id;
  }, []);

  // Auto-save to Drafts while typing.
  useEffect(() => {
    if (!hasContent) return;
    setSaved("saving");
    const t = setTimeout(() => {
      setDraftId(flushDraft());
      setSaved("saved");
    }, 600);
    return () => clearTimeout(t);
  }, [subject, body, encrypt, hasContent, flushDraft]);

  // Closing the window keeps whatever was typed as a draft.
  useEffect(
    () => () => {
      if (handled.current || !latest.current.hasContent) return;
      flushDraft();
      toast("Saved to Drafts");
    },
    [flushDraft],
  );

  const passError =
    encrypt && pass.length > 0 && pass.length < 6
      ? "Use at least 6 characters"
      : encrypt && pass2.length > 0 && pass !== pass2
        ? "Passphrases don't match"
        : null;
  const canSend = hasContent && !sending && (!encrypt || (pass.length >= 6 && pass === pass2));

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const payload = encrypt ? await encryptText(body, pass) : body;
      const { deliver } = mailbox.send({
        from,
        to,
        subject: subject.trim(),
        body: payload,
        excerpt: encrypt ? "Encrypted message — passphrase required" : makeExcerpt(body),
        encrypted: encrypt,
        deliverTo: address || null,
      });
      handled.current = true;
      if (draftRef.current) mailbox.destroy([draftRef.current]);
      toast.success(encrypt ? "Encrypted message sent" : "Message sent");
      setTimeout(() => notifyArrival([deliver()]), DELIVERY_DELAY_MS);
      onDone();
    } catch {
      toast.error("Couldn't encrypt this message. Please try again.");
      setSending(false);
    }
  };

  const discard = () => {
    handled.current = true;
    if (draftRef.current) mailbox.destroy([draftRef.current]);
    toast("Draft discarded");
    onDone();
  };

  return (
    <DialogContent
      className="glass max-h-[92svh] gap-0 overflow-y-auto rounded-3xl border-glass-border bg-popover/85 p-0 sm:max-w-2xl"
    >
      <DialogHeader className="border-b border-border px-6 py-5 text-left">
        <DialogTitle className="flex items-center gap-2 text-lg">
          <NotebookPen className="size-5 text-primary" /> {existing ? "Edit draft" : "New message"}
        </DialogTitle>
        <DialogDescription>
          Internal delivery — it lands in your own inbox. Disposable addresses can't send to outside
          mailboxes.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 px-6 py-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="From">
            <div className="glass-strong truncate rounded-xl px-3 py-2 font-mono text-xs text-muted-foreground">
              {from}
            </div>
          </Field>
          <Field label="To">
            <div className="glass-strong truncate rounded-xl px-3 py-2 font-mono text-xs text-foreground">
              {to}
            </div>
          </Field>
        </div>
        <Field label="Subject" htmlFor="compose-subject">
          <Input
            id="compose-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="What's this about?"
            maxLength={200}
            className="rounded-xl"
            autoFocus
          />
        </Field>
        <Field label="Message" htmlFor="compose-body">
          <Textarea
            id="compose-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your note…"
            maxLength={20000}
            className="min-h-48 rounded-xl leading-relaxed"
          />
        </Field>

        <div className="glass-strong rounded-2xl p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
                <Lock className="size-4" />
              </div>
              <div>
                <Label htmlFor="compose-encrypt" className="text-sm font-medium">
                  Encrypt with a passphrase
                </Label>
                <p className="text-xs text-muted-foreground">
                  AES-256 on this device. The passphrase is never saved.
                </p>
              </div>
            </div>
            <Switch id="compose-encrypt" checked={encrypt} onCheckedChange={setEncrypt} />
          </div>
          {encrypt && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 animate-fade-up">
              <Input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="Passphrase"
                aria-label="Passphrase"
                autoComplete="new-password"
                className="rounded-xl"
              />
              <Input
                type="password"
                value={pass2}
                onChange={(e) => setPass2(e.target.value)}
                placeholder="Confirm passphrase"
                aria-label="Confirm passphrase"
                autoComplete="new-password"
                className="rounded-xl"
              />
              {passError && <p className="text-xs text-destructive sm:col-span-2">{passError}</p>}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {saved === "saving" ? (
            <>
              <Loader2 className="size-3.5 animate-spin" /> Saving draft…
            </>
          ) : saved === "saved" ? (
            <>
              <Check className="size-3.5 text-success" /> Draft saved
            </>
          ) : (
            "Drafts save automatically"
          )}
        </span>
        <div className="flex gap-2">
          <Button variant="glass-danger" className="rounded-xl" onClick={discard} disabled={sending}>
            <Trash2 /> Discard
          </Button>
          <Button variant="hero" className="rounded-xl" onClick={send} disabled={!canSend}>
            {sending ? <Loader2 className="animate-spin" /> : <Send />} Send
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
