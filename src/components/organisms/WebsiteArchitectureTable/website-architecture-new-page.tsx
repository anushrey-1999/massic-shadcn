"use client";

import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Compass, Plus, Zap } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MassicAmoebaLoader } from "@/components/ui/massic-amoeba-loader";
import { Textarea } from "@/components/ui/textarea";
import { useFeatureActionGuard } from "@/hooks/use-permissions";
import {
  ARCHITECTURE_INSTRUCTIONS_LIMIT,
  architectureRequestError,
  useWebsiteArchitectureContent,
} from "@/hooks/use-website-architecture-content";
import { architectureRequestHref } from "@/lib/website-architecture-navigation";
import type { ArchitectureContentMode } from "@/types/website-architecture-content-types";
import type { WebsiteArchitectureScope } from "@/types/website-architecture-types";

const actionClass = "transition-colors active:opacity-80 disabled:opacity-60 motion-reduce:transition-none";
const focusClass = "focus-visible:ring-1 focus-visible:ring-ring/40";

const MODES = [
  { value: "auto", label: "Auto", Icon: Zap, description: "Massic makes routine decisions and only asks when it needs your input." },
  { value: "guided", label: "Guided", Icon: Compass, description: "Massic checks in at key decisions so you can steer the page." },
] as const satisfies ReadonlyArray<{ value: ArchitectureContentMode; label: string; Icon: typeof Zap; description: string }>;

export function WebsiteArchitectureNewPage({ businessId, scope }: {
  businessId: string;
  scope: WebsiteArchitectureScope;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const { startAdHoc } = useWebsiteArchitectureContent(businessId);
  const guardGenerate = useFeatureActionGuard("web.generatePage");
  const id = useId();
  const locked = useRef(false);
  const [open, setOpen] = useState(false);
  const [request, setRequest] = useState("");
  const [mode, setMode] = useState<ArchitectureContentMode>("auto");
  const [instructions, setInstructions] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);
  const mutation = useMutation({ mutationFn: startAdHoc, retry: false });
  const busy = mutation.isPending || mutation.isSuccess;
  const responseStatus = isAxiosError(mutation.error) ? mutation.error.response?.status : undefined;
  const uncertain = !responseStatus || responseStatus >= 500 || responseStatus === 408;

  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (locked.current) return;
      if (next) {
        setRequest("");
        setMode("auto");
        setInstructions("");
        setShowInstructions(false);
        mutation.reset();
      }
      setOpen(next);
    }}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" className={actionClass}>
          <Plus aria-hidden />New page
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 motion-reduce:animate-none sm:max-w-[520px]" showCloseButton={!busy}>
        <header className="space-y-0.5 px-5 pt-5 pr-12">
          <DialogTitle className="text-lg font-medium">New page</DialogTitle>
          <DialogDescription>Describe the page and Massic will plan and write it.</DialogDescription>
        </header>
        <form aria-busy={busy} onSubmit={(event) => {
          event.preventDefault();
          if (locked.current || !request.trim() || !guardGenerate()) return;
          locked.current = true;
          mutation.mutate({ request, mode, instructions: showInstructions ? instructions : "" }, {
            onSuccess: (artifact) => {
              router.push(architectureRequestHref(businessId, artifact.page_id, search, { run: "generate", v2Scope: scope }));
            },
            onError: () => { locked.current = false; },
          });
        }}>
          <div className="space-y-4 px-5 pt-4 pb-5">
            <div className="space-y-1.5">
              <label htmlFor={`${id}-request`} className="text-sm font-medium">
                What page do you want to create?
              </label>
              <Textarea
                id={`${id}-request`}
                required
                rows={3}
                value={request}
                onChange={(event) => setRequest(event.target.value)}
                disabled={busy}
                className={focusClass}
                placeholder="For example, a page about bookkeeping for small businesses"
              />
            </div>
            <fieldset className="space-y-1.5" disabled={busy}>
              <legend id={`${id}-mode`} className="mb-1.5 text-sm font-medium">Mode</legend>
              <RadioGroupPrimitive.Root
                value={mode}
                onValueChange={(value: ArchitectureContentMode) => setMode(value)}
                aria-labelledby={`${id}-mode`}
                aria-describedby={`${id}-mode-help`}
                disabled={busy}
                orientation="horizontal"
                className="inline-grid grid-cols-2 gap-0.5 rounded-lg bg-muted p-0.5"
              >
                {MODES.map(({ value, label, Icon }) => (
                  <RadioGroupPrimitive.Item
                    key={value}
                    value={value}
                    className="inline-flex h-8 min-w-28 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-transparent px-3 text-sm text-general-muted-foreground transition-colors hover:text-general-foreground outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60 data-[state=checked]:border-general-border data-[state=checked]:bg-white data-[state=checked]:font-medium data-[state=checked]:text-general-foreground data-[state=checked]:shadow-xs motion-reduce:transition-none"
                  >
                    <Icon aria-hidden className="size-3.5" />
                    {label}
                  </RadioGroupPrimitive.Item>
                ))}
              </RadioGroupPrimitive.Root>
              <p id={`${id}-mode-help`} aria-live="polite" className="text-[13px] text-general-muted-foreground">
                {MODES.find((item) => item.value === mode)?.description}
              </p>
            </fieldset>
            {showInstructions ? (
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <label htmlFor={`${id}-instructions`} className="text-sm font-medium">
                    Instructions <span className="font-normal text-general-muted-foreground">(optional)</span>
                  </label>
                  <span id={`${id}-instructions-limit`} className="text-xs text-general-muted-foreground tabular-nums">
                    {instructions.length.toLocaleString()} / {ARCHITECTURE_INSTRUCTIONS_LIMIT.toLocaleString()}
                  </span>
                </div>
                <Textarea
                  id={`${id}-instructions`}
                  aria-describedby={`${id}-instructions-limit`}
                  rows={2}
                  autoFocus
                  value={instructions}
                  onChange={(event) => setInstructions(event.target.value)}
                  maxLength={ARCHITECTURE_INSTRUCTIONS_LIMIT}
                  disabled={busy}
                  className={focusClass}
                  placeholder="What should this page emphasize or avoid?"
                />
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => setShowInstructions(true)}
                className={`-ml-2 font-normal text-general-unofficial-foreground-alt ${actionClass}`}
              >
                <Plus aria-hidden />Add instructions
              </Button>
            )}
            {mutation.isError && (
              <p role="alert" className="text-sm text-destructive">
                {architectureRequestError(mutation.error, uncertain
                  ? "Massic couldn’t confirm whether the request started. Check the page list before trying again."
                  : "Couldn’t start this request. Please try again.")}
              </p>
            )}
          </div>
          <DialogFooter className="border-t bg-general-primary-foreground px-5 py-3">
            <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)} className={actionClass}>Cancel</Button>
            <Button type="submit" disabled={busy || !request.trim()} className={actionClass}>
              {busy && <MassicAmoebaLoader size={16} label={null} />}
              {mutation.isSuccess ? "Opening page…" : busy ? "Starting…" : "Start generation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
