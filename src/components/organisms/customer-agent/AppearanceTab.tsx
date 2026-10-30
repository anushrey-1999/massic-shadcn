"use client";

import { useMemo, useRef } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { ArrowRight, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useFormDirtyState } from "@/hooks/use-form-dirty-state";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import type { useCustomerAgent } from "@/hooks/use-customer-agent";
import { businessPageUrl, pickAppearance, previewConfig } from "@/lib/customer-agent";
import {
  SUGGESTED_QUESTIONS_MAX,
  appearanceSchema,
  type AppearanceValues,
  type CustomerAgentConfig,
} from "@/types/customer-agent";
import { AccentColorField } from "./AccentColorField";
import { FieldRow, Hint, RadioOptions, SECONDARY_BUTTON_CLASS, fieldError } from "./controls";
import { StepFooter } from "./onboarding/StepLayout";
import { PreviewPanel } from "./PreviewPanel";
import { SaveActions } from "./SaveActions";
import { Section } from "./Section";
import { ThemePresetPicker } from "./ThemePresetPicker";

interface AppearanceTabProps {
  businessId: string;
  config: CustomerAgentConfig;
  update: ReturnType<typeof useCustomerAgent>["update"];
  /** Guided setup: the footer replaces the header save actions and saving moves on. */
  setup?: { onBack: () => void; onContinue: () => void };
}

/** Trims free-text lists so blank lines never reach the API. */
function normalize(values: AppearanceValues): AppearanceValues {
  const clean = (items: string[]) => items.map((item) => item.trim()).filter(Boolean);
  return {
    ...values,
    theme: {
      ...values.theme,
      mode: "auto",
      show_powered_by: true,
    },
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

export function AppearanceTab({
  businessId,
  config,
  update,
  setup,
}: AppearanceTabProps) {
  const savedRef = useRef(pickAppearance(config));
  const form = useForm({
    defaultValues: savedRef.current,
    validators: { onChange: appearanceSchema },
    onSubmit: async ({ value }) => {
      const next = normalize(value);
      try {
        await update.mutateAsync({ changes: { appearance: next }, successMessage: "Appearance saved" });
      } catch {
        return;
      }
      savedRef.current = next;
      form.reset(next);
      resetBaseline(next);
      setup?.onContinue();
    },
    onSubmitInvalid: () => {
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
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex h-full min-h-0 flex-1 gap-6 overflow-auto">
        <div className="flex min-w-0 max-w-[640px] flex-1 flex-col gap-4">
          <Section
            title="Look and feel"
            action={
              setup ? undefined : (
                <SaveActions isDirty={isDirty} isSubmitting={isSubmitting} onReset={handleReset} />
              )
            }
          >
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
                  <FieldRow label="Suggested questions" hint={`Up to ${SUGGESTED_QUESTIONS_MAX}.`}>
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
                              <Hint label="Remove question">
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
                              </Hint>
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

              <div className="grid gap-5 sm:grid-cols-2">
                <form.Field name="theme.launcher.position">
                  {(field) => (
                    <FieldRow label="Chat button position">
                      <RadioOptions
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

                <form.Field name="theme.launcher.style">
                  {(field) => (
                    <FieldRow label="Chat button style">
                      <RadioOptions
                        label="Chat button style"
                        value={field.state.value === "logo" ? "icon" : field.state.value}
                        onChange={field.handleChange}
                        options={[
                          { value: "icon", label: "Icon" },
                          { value: "pill", label: "Label" },
                        ]}
                      />
                    </FieldRow>
                  )}
                </form.Field>
              </div>

              {values.theme.launcher.style === "pill" && (
                <form.Field name="theme.launcher.label">
                  {(field) => (
                    <FieldRow label="Button label" htmlFor="ca-launcher-label" error={fieldError(field.state.meta.errors)}>
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

            <div className="mt-5 space-y-5 border-t border-general-border pt-5">
                <div className="space-y-3">
                  <form.Field name="content.teaser.enabled">
                    {(field) => (
                      <label className="flex w-fit cursor-pointer items-center gap-3 text-sm text-general-foreground">
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
                      <label className="flex w-fit cursor-pointer items-center gap-3 text-sm text-general-foreground">
                        <Switch checked={field.state.value} onCheckedChange={field.handleChange} />
                        Hide the chat button on phones
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
            </div>
          </Section>
        </div>

        <PreviewPanel
          businessId={businessId}
          config={widgetConfig}
          siteId={config.site_id}
          pageUrl={businessPageUrl(config.business.website)}
          showDeviceToggle
          showTest={!setup}
        />
      </div>

      {setup && (
        <StepFooter onBack={setup.onBack}>
          {isDirty ? (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {isSubmitting ? "Saving…" : "Save and continue"}
            </Button>
          ) : (
            <Button type="button" onClick={setup.onContinue}>
              Continue
              <ArrowRight className="size-4" />
            </Button>
          )}
        </StepFooter>
      )}
    </form>
  );
}
