import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SaveActionsProps {
  isDirty: boolean;
  isSubmitting: boolean;
  onReset: () => void;
}

export function SaveActions({
  isDirty,
  isSubmitting,
  onReset,
}: SaveActionsProps) {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={onReset}
        disabled={!isDirty || isSubmitting}
      >
        Reset
      </Button>
      <Button type="submit" disabled={!isDirty || isSubmitting}>
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        {isSubmitting ? "Saving…" : "Save changes"}
      </Button>
    </>
  );
}
