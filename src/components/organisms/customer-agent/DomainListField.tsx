"use client";

import { useId, useState, type FormEvent } from "react";
import { Globe, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseDomain } from "@/lib/customer-agent";

interface DomainListFieldProps {
  domains: string[];
  /** Persists the next list; resolves true on success. */
  onSave: (domains: string[], successMessage: string) => Promise<boolean>;
  saving: boolean;
}

export function DomainListField({ domains, onSave, saving }: DomainListFieldProps) {
  const inputId = useId();
  const errorId = useId();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const result = parseDomain(draft);
    if ("error" in result) return setError(result.error);
    if (domains.includes(result.origin)) return setError("This domain is already allowed.");
    setError(null);
    if (await onSave([...domains, result.origin], "Domain added")) setDraft("");
  };

  const handleRemove = async (origin: string) => {
    if (saving) return;
    setRemoving(origin);
    await onSave(
      domains.filter((domain) => domain !== origin),
      "Domain removed"
    );
    setRemoving(null);
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleAdd} className="flex items-start gap-2" noValidate>
        <div className="w-full max-w-[320px] space-y-1.5">
          <label htmlFor={inputId} className="sr-only">
            Domain
          </label>
          <Input
            id={inputId}
            value={draft}
            placeholder="example.com"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => {
              setDraft(event.target.value);
              if (error) setError(null);
            }}
          />
          {error && (
            <p id={errorId} className="text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
        <Button type="submit" variant="outline" disabled={saving || !draft.trim()}>
          {saving && !removing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          Add domain
        </Button>
      </form>

      {domains.length === 0 ? (
        <p className="text-sm text-general-muted-foreground">
          No domains yet. The agent only answers on domains listed here.
        </p>
      ) : (
        <ul className="divide-y divide-general-border rounded-lg border border-general-border">
          {domains.map((origin) => (
            <li key={origin} className="flex h-11 items-center justify-between gap-3 px-3">
              <span className="flex min-w-0 items-center gap-2 text-sm text-general-foreground">
                <Globe className="size-4 shrink-0 text-general-muted-foreground" />
                <span className="truncate">{origin}</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-general-muted-foreground"
                disabled={saving}
                onClick={() => handleRemove(origin)}
                aria-label={`Remove ${origin}`}
              >
                {removing === origin ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <X className="size-4" />
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-general-muted-foreground">
        Add each exact domain, such as www.example.com. To allow every subdomain, enter
        *.example.com.
      </p>
    </div>
  );
}
