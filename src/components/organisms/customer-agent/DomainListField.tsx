"use client";

import { useId, useState, type FormEvent } from "react";
import { Globe, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseDomain } from "@/lib/customer-agent";
import { SECONDARY_BUTTON_CLASS } from "./controls";

interface DomainListFieldProps {
  domains: string[];
  /** Profile website; offered as a one-click first domain. */
  suggestedWebsite?: string | null;
  /** Persists the next list; resolves true on success. */
  onSave: (domains: string[], successMessage: string) => Promise<boolean>;
  saving: boolean;
}

const hostOf = (origin: string) => origin.replace(/^https:\/\//, "");

/** Profile websites are often saved as bare or http:// URLs; the agent only allows https origins. */
function suggestedOrigin(website: string | null | undefined, domains: string[]): string | null {
  if (!website || domains.length > 0) return null;
  const result = parseDomain(website.trim().replace(/^http:\/\//i, "https://"));
  return "origin" in result ? result.origin : null;
}

export function DomainListField({ domains, suggestedWebsite, onSave, saving }: DomainListFieldProps) {
  const inputId = useId();
  const errorId = useId();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const suggestion = suggestedOrigin(suggestedWebsite, domains);

  const save = async (next: string[], key: string, message: string) => {
    setPending(key);
    const ok = await onSave(next, message);
    setPending(null);
    return ok;
  };

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const result = parseDomain(draft);
    if ("error" in result) return setError(result.error);
    if (domains.includes(result.origin)) return setError("This domain is already added.");
    setError(null);
    if (await save([...domains, result.origin], "add", "Domain added")) setDraft("");
  };

  return (
    <div className="space-y-2.5">
      {domains.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {domains.map((origin) => (
            <li
              key={origin}
              className="flex h-8 items-center gap-1.5 rounded-md border border-general-border bg-general-primary-foreground pr-1 pl-2.5 text-sm text-general-foreground"
            >
              <Globe className="size-3.5 shrink-0 text-general-muted-foreground" aria-hidden />
              <span className="max-w-[240px] truncate">{hostOf(origin)}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6 text-general-muted-foreground"
                disabled={saving}
                onClick={() => save(domains.filter((domain) => domain !== origin), origin, "Domain removed")}
                aria-label={`Remove ${hostOf(origin)}`}
              >
                {pending === origin ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {suggestion && (
        <Button type="button" size="sm" disabled={saving} onClick={() => save([suggestion], "suggestion", "Website added")}>
          {pending === "suggestion" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Add {hostOf(suggestion)}
        </Button>
      )}

      <form onSubmit={handleAdd} className="flex items-start gap-2" noValidate>
        <div className="w-full max-w-[320px] space-y-1.5">
          <label htmlFor={inputId} className="sr-only">
            Domain
          </label>
          <Input
            id={inputId}
            className="h-8"
            value={draft}
            placeholder={suggestion ? "Or enter another domain" : "example.com or *.example.com"}
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
        <Button type="submit" variant="outline" size="sm" className={SECONDARY_BUTTON_CLASS} disabled={saving || !draft.trim()}>
          {pending === "add" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Add
        </Button>
      </form>
    </div>
  );
}
