import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SaveBarProps {
  isDirty: boolean;
  isSubmitting: boolean;
  onReset: () => void;
}

/** Sticky footer for a settings form; place it as the form's last child so Save submits it. */
export function SaveBar({ isDirty, isSubmitting, onReset }: SaveBarProps) {
  return (
    <div className="sticky bottom-0 z-10 -mx-1 flex items-center justify-end gap-3 border-t border-general-border bg-general-primary-foreground px-1 py-3">
      {isDirty && <p className="mr-auto text-sm text-general-muted-foreground">You have unsaved changes.</p>}
      <Button type="button" variant="outline" onClick={onReset} disabled={!isDirty || isSubmitting}>
        Reset
      </Button>
      <Button type="submit" disabled={!isDirty || isSubmitting}>
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        {isSubmitting ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}
