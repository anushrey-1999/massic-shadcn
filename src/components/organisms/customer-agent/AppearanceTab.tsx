"use client";

import { useMemo, useRef, useState } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { ChevronDown, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useFormDirtyState } from "@/hooks/use-form-dirty-state";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import type { useCustomerAgent } from "@/hooks/use-customer-agent";
import { pickAppearance, previewConfig } from "@/lib/customer-agent";
import {
  SUGGESTED_QUESTIONS_MAX,
  appearanceSchema,
  type AppearanceValues,
  type CustomerAgentConfig,
} from "@/types/customer-agent";
import { AccentColorField } from "./AccentColorField";
import { ChoiceGroup, FieldRow, SECONDARY_BUTTON_CLASS, fieldError } from "./controls";
import { PreviewPanel } from "./PreviewPanel";
import { SaveBar } from "./SaveBar";
import { Section } from "./Section";
import { ThemePresetPicker } from "./ThemePresetPicker";

interface AppearanceTabProps {
  businessId: string;
  config: CustomerAgentConfig;
  update: ReturnType<typeof useCustomerAgent>["update"];
}

/** Trims free-text lists so blank lines never reach the API. */
function normalize(values: AppearanceValues): AppearanceValues {
  const clean = (items: string[]) => items.map((item) => item.trim()).filter(Boolean);
  return {
    ...values,
    content: { ...values.content, suggested_questions: clean(values.content.suggested_questions) },
    visibility: {
      include_paths: clean(values.visibility.include_paths),
      exclude_paths: clean(values.visibility.exclude_paths),
    },
  };
}

const toLines = (items: string[]) => items.join("\n");
const fromLines = (text: string) => text.split("\n");
const toInt = (text: string) => Math.max(0, Math.trunc(Number(text) || 0));

export function AppearanceTab({ businessId, config, update }: AppearanceTabProps) {
  const savedRef = useRef(pickAppearance(config));
  const [moreOpen, setMoreOpen] = useState(false);

  const form = useForm({
    defaultValues: savedRef.current,
    validators: { onChange: appearanceSchema },
    onSubmit: async ({ value }) => {
      const next = normalize(value);
      try {
        await update.mutateAsync({ changes: next, successMessage: "Appearance saved" });
      } catch {
        return;
      }
      savedRef.current = next;
      form.reset(next);
      resetBaseline(next);
    },
    onSubmitInvalid: () => {
      // The invalid field may sit inside the collapsed section.
      setMoreOpen(true);
      toast.error("Fix the highlighted fields", { description: "Then save your changes again." });
    },
  });

  const { isDirty, resetBaseline } = useFormDirtyState({ form });
  useUnsavedChangesGuard({ isDirty });

  const values = useStore(form.store, (state) => state.values);
  const isSubmitting = useStore(form.store, (state) => state.isSubmitting);

  // The preview only receives valid values, so it keeps showing the last good state while typing.
  const lastValid = useRef(savedRef.current);
  const previewValues = useMemo(() => {
    const parsed = appearanceSchema.safeParse(values);
    if (parsed.success) lastValid.current = normalize(parsed.data);
    return lastValid.current;
  }, [values]);
  const widgetConfig = useMemo(() => previewConfig(config, previewValues), [config, previewValues]);

  const handleReset = () => {
    form.reset(savedRef.current);
    resetBaseline(savedRef.current);
  };

  const { business } = config;

  return (
    <div className="flex h-full min-h-0 gap-6 overflow-auto">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
        className="flex min-w-0 max-w-[640px] flex-1 flex-col gap-4"
      >
        <Section title="Look and feel">
          <div className="space-y-5">
            <form.Field name="theme.preset">
              {(field) => (
                <FieldRow label="Style">
                  <ThemePresetPicker
                    value={field.state.value}
                    accent={values.theme.accent}
                    onChange={field.handleChange}
                  />
                </FieldRow>
              )}
            </form.Field>

            <form.Field name="theme.accent">
              {(field) => (
                <AccentColorField
                  value={field.state.value}
                  onChange={field.handleChange}
                  error={fieldError(field.state.meta.errors)}
                />
              )}
            </form.Field>

            <form.Field name="theme.launcher.position">
              {(field) => (
                <FieldRow label="Chat button position">
                  <ChoiceGroup
                    label="Chat button position"
                    value={field.state.value}
                    onChange={field.handleChange}
                    options={[
                      { value: "left", label: "Bottom left" },
                      { value: "right", label: "Bottom right" },
                    ]}
                  />
                </FieldRow>
              )}
            </form.Field>

            <form.Field name="content.greeting">
              {(field) => (
                <FieldRow label="Greeting" htmlFor="ca-greeting" error={fieldError(field.state.meta.errors)}>
                  <Textarea
                    id="ca-greeting"
                    rows={2}
                    value={field.state.value}
                    maxLength={200}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                </FieldRow>
              )}
            </form.Field>

            <form.Field name="content.suggested_questions" mode="array">
              {(field) => (
                <FieldRow
                  label="Suggested questions"
                  hint={`Up to ${SUGGESTED_QUESTIONS_MAX}.`}
                >
                  <div className="space-y-2">
                    {field.state.value.map((_, index) => (
                      <form.Field key={index} name={`content.suggested_questions[${index}]`}>
                        {(question) => (
                          <div className="flex items-start gap-2">
                            <div className="flex-1 space-y-1">
                              <Input
                                value={question.state.value}
                                maxLength={120}
                                aria-label={`Suggested question ${index + 1}`}
                                placeholder="Do you offer emergency service?"
                                onChange={(event) => question.handleChange(event.target.value)}
                              />
                              {fieldError(question.state.meta.errors) && (
                                <p className="text-xs text-destructive">{fieldError(question.state.meta.errors)}</p>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-9 text-general-muted-foreground"
                              aria-label={`Remove question ${index + 1}`}
                              onClick={() => field.removeValue(index)}
                            >
                              <X className="size-4" />
                            </Button>
                          </div>
                        )}
                      </form.Field>
                    ))}
                    {field.state.value.length < SUGGESTED_QUESTIONS_MAX && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={SECONDARY_BUTTON_CLASS}
                        onClick={() => field.pushValue("")}
                      >
                        <Plus className="size-4" />
                        Add question
                      </Button>
                    )}
                  </div>
                </FieldRow>
              )}
            </form.Field>
          </div>

          <Collapsible open={moreOpen} onOpenChange={setMoreOpen} className="mt-5 border-t border-general-border pt-3">
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="group -ml-2 text-general-muted-foreground">
                More options
                <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-5 pt-3">
              <div className="grid gap-5 sm:grid-cols-2">
                <form.Field name="theme.mode">
                  {(field) => (
                    <FieldRow label="Color mode">
                      <ChoiceGroup
                        label="Color mode"
                        value={field.state.value}
                        onChange={field.handleChange}
                        options={[
                          { value: "light", label: "Light" },
                          { value: "dark", label: "Dark" },
                          { value: "auto", label: "Auto" },
                        ]}
                      />
                    </FieldRow>
                  )}
                </form.Field>

                <form.Field name="theme.launcher.style">
                  {(field) => (
                    <FieldRow
                      label="Chat button style"
                      hint={
                        field.state.value === "logo" && !business.logo_url
                          ? "No logo on your Profile yet, so the icon shows instead."
                          : undefined
                      }
                    >
                      <ChoiceGroup
                        label="Chat button style"
                        value={field.state.value}
                        onChange={field.handleChange}
                        options={[
                          { value: "icon", label: "Icon" },
                          { value: "logo", label: "Logo" },
                          { value: "pill", label: "Label" },
                        ]}
                      />
                    </FieldRow>
                  )}
                </form.Field>

                {values.theme.launcher.style === "pill" && (
                  <form.Field name="theme.launcher.label">
                    {(field) => (
                      <FieldRow
                        label="Button label"
                        htmlFor="ca-launcher-label"
                        error={fieldError(field.state.meta.errors)}
                      >
                        <Input
                          id="ca-launcher-label"
                          value={field.state.value ?? ""}
                          placeholder={`Chat with ${business.name}`}
                          maxLength={40}
                          onChange={(event) => field.handleChange(event.target.value || null)}
                        />
                      </FieldRow>
                    )}
                  </form.Field>
                )}
              </div>

              <FieldRow label="Quick actions">
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {(
                    [
                      { key: "call", label: "Call", available: Boolean(business.phone), missing: "Add a phone number to your Profile" },
                      { key: "book", label: "Book", available: Boolean(config.behavior.booking_url), missing: "Add a booking link in Behavior" },
                      { key: "quote", label: "Get a quote", available: true, missing: "" },
                    ] as const
                  ).map((action) => (
                    <form.Field key={action.key} name={`content.quick_actions.${action.key}`}>
                      {(field) => (
                        <label
                          className="flex items-center gap-2 text-sm text-general-foreground"
                          title={action.available ? undefined : action.missing}
                        >
                          <Checkbox
                            checked={field.state.value && action.available}
                            disabled={!action.available}
                            onCheckedChange={(checked) => field.handleChange(checked === true)}
                          />
                          <span className={action.available ? undefined : "text-general-muted-foreground"}>
                            {action.label}
                          </span>
                        </label>
                      )}
                    </form.Field>
                  ))}
                </div>
              </FieldRow>

              <div className="space-y-3">
                <form.Field name="content.teaser.enabled">
                  {(field) => (
                    <label className="flex items-center gap-3 text-sm text-general-foreground">
                      <Switch checked={field.state.value} onCheckedChange={field.handleChange} />
                      Show a short message next to the chat button
                    </label>
                  )}
                </form.Field>
                {values.content.teaser.enabled && (
                  <div className="grid gap-3 pl-12 sm:grid-cols-[1fr_140px]">
                    <form.Field name="content.teaser.text">
                      {(field) => (
                        <FieldRow label="Message" htmlFor="ca-teaser" error={fieldError(field.state.meta.errors)}>
                          <Input
                            id="ca-teaser"
                            value={field.state.value ?? ""}
                            maxLength={80}
                            placeholder="Questions? We reply in seconds."
                            onChange={(event) => field.handleChange(event.target.value || null)}
                          />
                        </FieldRow>
                      )}
                    </form.Field>
                    <form.Field name="content.teaser.delay_seconds">
                      {(field) => (
                        <FieldRow
                          label="Delay (seconds)"
                          htmlFor="ca-teaser-delay"
                          error={fieldError(field.state.meta.errors)}
                        >
                          <Input
                            id="ca-teaser-delay"
                            type="number"
                            min={0}
                            max={120}
                            value={field.state.value}
                            onChange={(event) => field.handleChange(toInt(event.target.value))}
                          />
                        </FieldRow>
                      )}
                    </form.Field>
                  </div>
                )}

                <form.Field name="theme.launcher.hide_on_mobile">
                  {(field) => (
                    <label className="flex items-center gap-3 text-sm text-general-foreground">
                      <Switch checked={field.state.value} onCheckedChange={field.handleChange} />
                      Hide the chat button on phones
                    </label>
                  )}
                </form.Field>

                <form.Field name="theme.show_powered_by">
                  {(field) => (
                    <label className="flex items-center gap-3 text-sm text-general-foreground">
                      <Switch checked={field.state.value} onCheckedChange={field.handleChange} />
                      Show &ldquo;Powered by Massic&rdquo; in the chat footer
                    </label>
                  )}
                </form.Field>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium text-general-foreground">Pages</p>
                <p className="text-xs text-general-muted-foreground">
                  Empty means every page. One path per line, * as a wildcard.
                </p>
                <div className="grid gap-3 pt-2 sm:grid-cols-2">
                  <form.Field name="visibility.include_paths">
                    {(field) => (
                      <FieldRow label="Only show on" htmlFor="ca-include">
                        <Textarea
                          id="ca-include"
                          rows={3}
                          className="font-mono text-xs"
                          placeholder="/services/*"
                          value={toLines(field.state.value)}
                          onChange={(event) => field.handleChange(fromLines(event.target.value))}
                        />
                      </FieldRow>
                    )}
                  </form.Field>
                  <form.Field name="visibility.exclude_paths">
                    {(field) => (
                      <FieldRow label="Never show on" htmlFor="ca-exclude">
                        <Textarea
                          id="ca-exclude"
                          rows={3}
                          className="font-mono text-xs"
                          placeholder="/checkout/*"
                          value={toLines(field.state.value)}
                          onChange={(event) => field.handleChange(fromLines(event.target.value))}
                        />
                      </FieldRow>
                    )}
                  </form.Field>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Section>

        <SaveBar isDirty={isDirty} isSubmitting={isSubmitting} onReset={handleReset} />
      </form>

      <PreviewPanel
        businessId={businessId}
        config={widgetConfig}
        pageUrl={config.domains[0] ?? "https://example.com"}
        showDeviceToggle
      />
    </div>
  );
}
