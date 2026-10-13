"use client";

import { useMemo, useRef, useState } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { MessageSquareText, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useFormDirtyState } from "@/hooks/use-form-dirty-state";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import type { useCustomerAgent } from "@/hooks/use-customer-agent";
import { previewConfig } from "@/lib/customer-agent";
import {
  SUGGESTED_QUESTIONS_MAX,
  appearanceSchema,
  type AppearanceValues,
  type CustomerAgentConfig,
  type ThemeFont,
} from "@/types/customer-agent";
import { AccentColorField } from "./AccentColorField";
import { ChoiceGroup, FieldRow, fieldError } from "./controls";
import { SaveBar } from "./SaveBar";
import { Section } from "./Section";
import { TestAgentDialog } from "./TestAgentDialog";
import { ThemePresetPicker } from "./ThemePresetPicker";
import { WidgetPreview, type PreviewLayout, type PreviewView } from "./WidgetPreview";

interface AppearanceTabProps {
  businessId: string;
  config: CustomerAgentConfig;
  update: ReturnType<typeof useCustomerAgent>["update"];
}

const FONT_LABELS: Record<ThemeFont, string> = {
  system: "System default",
  inter: "Inter",
  "source-sans-3": "Source Sans 3",
  atkinson: "Atkinson Hyperlegible",
  lora: "Lora (serif)",
};
const PRESET_CORNERS = "preset";

function pickAppearance({ theme, content, visibility }: CustomerAgentConfig): AppearanceValues {
  return { theme, content, visibility };
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
  const [view, setView] = useState<PreviewView>("welcome");
  const [layout, setLayout] = useState<PreviewLayout>("panel");
  const [testOpen, setTestOpen] = useState(false);

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
        className="flex min-w-0 max-w-[752px] flex-1 flex-col gap-4"
      >
        <Section title="Style" description="Pick a starting look, then fine-tune it for your brand.">
          <div className="space-y-5">
            <form.Field name="theme.preset">
              {(field) => (
                <ThemePresetPicker
                  value={field.state.value}
                  accent={values.theme.accent}
                  onChange={field.handleChange}
                />
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

            <div className="grid gap-5 sm:grid-cols-2">
              <form.Field name="theme.mode">
                {(field) => (
                  <FieldRow label="Color mode" hint="Auto follows the visitor's device setting.">
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

              <form.Field name="theme.visitor_bubble">
                {(field) => (
                  <FieldRow label="Visitor messages">
                    <ChoiceGroup
                      label="Visitor messages"
                      value={field.state.value}
                      onChange={field.handleChange}
                      options={[
                        { value: "neutral", label: "Neutral" },
                        { value: "accent", label: "Accent" },
                      ]}
                    />
                  </FieldRow>
                )}
              </form.Field>

              <form.Field name="theme.corners">
                {(field) => (
                  <FieldRow label="Corners">
                    <Select
                      value={field.state.value ?? PRESET_CORNERS}
                      onValueChange={(next) =>
                        field.handleChange(next === PRESET_CORNERS ? null : (next as "sharp" | "rounded" | "soft"))
                      }
                    >
                      <SelectTrigger className="w-full" aria-label="Corners">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={PRESET_CORNERS}>Match style</SelectItem>
                        <SelectItem value="sharp">Sharp</SelectItem>
                        <SelectItem value="rounded">Rounded</SelectItem>
                        <SelectItem value="soft">Soft</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>
                )}
              </form.Field>

              <form.Field name="theme.font">
                {(field) => (
                  <FieldRow label="Font">
                    <Select value={field.state.value} onValueChange={(next) => field.handleChange(next as ThemeFont)}>
                      <SelectTrigger className="w-full" aria-label="Font">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(FONT_LABELS) as ThemeFont[]).map((font) => (
                          <SelectItem key={font} value={font}>
                            {FONT_LABELS[font]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldRow>
                )}
              </form.Field>

              <form.Field name="theme.motion">
                {(field) => (
                  <FieldRow label="Motion" hint="Visitors who prefer reduced motion always get none.">
                    <ChoiceGroup
                      label="Motion"
                      value={field.state.value}
                      onChange={field.handleChange}
                      options={[
                        { value: "subtle", label: "Subtle" },
                        { value: "expressive", label: "Expressive" },
                        { value: "off", label: "Off" },
                      ]}
                    />
                  </FieldRow>
                )}
              </form.Field>
            </div>
          </div>
        </Section>

        <Section title="Chat button" description="How the button looks and where it sits on your site.">
          <div className="grid gap-5 sm:grid-cols-2">
            <form.Field name="theme.launcher.style">
              {(field) => (
                <FieldRow
                  label="Button style"
                  hint={field.state.value === "logo" && !business.logo_url ? "No logo on your Profile yet, so the icon shows instead." : undefined}
                >
                  <ChoiceGroup
                    label="Button style"
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

            <form.Field name="theme.launcher.position">
              {(field) => (
                <FieldRow label="Position">
                  <ChoiceGroup
                    label="Position"
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

            <div className="grid grid-cols-2 gap-3">
              <form.Field name="theme.launcher.offset_x">
                {(field) => (
                  <FieldRow label="Side gap (px)" htmlFor="ca-offset-x" error={fieldError(field.state.meta.errors)}>
                    <Input
                      id="ca-offset-x"
                      type="number"
                      min={0}
                      max={200}
                      value={field.state.value}
                      onChange={(event) => field.handleChange(toInt(event.target.value))}
                    />
                  </FieldRow>
                )}
              </form.Field>
              <form.Field name="theme.launcher.offset_y">
                {(field) => (
                  <FieldRow label="Bottom gap (px)" htmlFor="ca-offset-y" error={fieldError(field.state.meta.errors)}>
                    <Input
                      id="ca-offset-y"
                      type="number"
                      min={0}
                      max={200}
                      value={field.state.value}
                      onChange={(event) => field.handleChange(toInt(event.target.value))}
                    />
                  </FieldRow>
                )}
              </form.Field>
            </div>

            <form.Field name="theme.launcher.hide_on_mobile">
              {(field) => (
                <label className="flex items-center gap-3 text-sm text-general-foreground sm:col-span-2">
                  <Switch checked={field.state.value} onCheckedChange={field.handleChange} />
                  Hide the chat button on phones
                </label>
              )}
            </form.Field>
          </div>
        </Section>

        <Section title="Messages" description="What visitors see when they open the chat.">
          <div className="space-y-5">
            <form.Field name="content.status_text">
              {(field) => (
                <FieldRow
                  label="Status line"
                  htmlFor="ca-status"
                  hint="Shown under your business name."
                  error={fieldError(field.state.meta.errors)}
                >
                  <Input
                    id="ca-status"
                    value={field.state.value}
                    maxLength={60}
                    placeholder="Usually answers instantly"
                    onChange={(event) => field.handleChange(event.target.value)}
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
                  hint={`Up to ${SUGGESTED_QUESTIONS_MAX}. Visitors can tap one to start.`}
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
                      <Button type="button" variant="outline" size="sm" onClick={() => field.pushValue("")}>
                        <Plus className="size-4" />
                        Add question
                      </Button>
                    )}
                  </div>
                </FieldRow>
              )}
            </form.Field>

            <FieldRow label="Quick actions" hint="Call uses the phone on your Profile. Book uses the booking link in Behavior.">
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

            <div className="space-y-3 rounded-lg border border-general-border p-3">
              <form.Field name="content.teaser.enabled">
                {(field) => (
                  <label className="flex items-center gap-3 text-sm text-general-foreground">
                    <Switch checked={field.state.value} onCheckedChange={field.handleChange} />
                    Show a short message next to the chat button
                  </label>
                )}
              </form.Field>
              {values.content.teaser.enabled && (
                <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
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
                      <FieldRow label="Delay (seconds)" htmlFor="ca-teaser-delay" error={fieldError(field.state.meta.errors)}>
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
            </div>
          </div>
        </Section>

        <Section title="Pages" description="Leave both empty to show the agent on every page.">
          <div className="grid gap-5 sm:grid-cols-2">
            <form.Field name="visibility.include_paths">
              {(field) => (
                <FieldRow label="Only show on" htmlFor="ca-include" hint="One path per line. Use * as a wildcard, like /services/*.">
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
                <FieldRow label="Never show on" htmlFor="ca-exclude" hint="Checked after the list on the left.">
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
        </Section>

        <Section title="Branding">
          <form.Field name="theme.show_powered_by">
            {(field) => (
              <label className="flex items-center gap-3 text-sm text-general-foreground">
                <Switch checked={field.state.value} onCheckedChange={field.handleChange} />
                Show &ldquo;Powered by Massic&rdquo; in the chat footer
              </label>
            )}
          </form.Field>
        </Section>

        <SaveBar isDirty={isDirty} isSubmitting={isSubmitting} onReset={handleReset} />
      </form>

      <aside className="sticky top-0 hidden w-[392px] shrink-0 flex-col items-center gap-3 self-start lg:flex">
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <ChoiceGroup
            label="Preview content"
            value={view}
            onChange={setView}
            options={[
              { value: "welcome", label: "Welcome" },
              { value: "conversation", label: "Conversation" },
            ]}
          />
          <ChoiceGroup
            label="Preview device"
            value={layout}
            onChange={setLayout}
            options={[
              { value: "panel", label: "Desktop" },
              { value: "sheet", label: "Mobile" },
            ]}
          />
        </div>
        <WidgetPreview config={widgetConfig} view={view} layout={layout} />
        <Button variant="outline" className="w-full" onClick={() => setTestOpen(true)}>
          <MessageSquareText className="size-4" />
          Test your agent
        </Button>
        <p className="text-center text-xs text-general-muted-foreground">
          Test chats use your saved knowledge and don&apos;t count toward usage.
        </p>
      </aside>

      <TestAgentDialog
        businessId={businessId}
        open={testOpen}
        onOpenChange={setTestOpen}
        config={widgetConfig}
        pageUrl={config.domains[0] ?? "https://example.com"}
      />
    </div>
  );
}
