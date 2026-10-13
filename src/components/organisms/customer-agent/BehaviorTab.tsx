"use client";

import { useRef } from "react";
import Link from "next/link";
import { useForm, useStore } from "@tanstack/react-form";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { TagsInput } from "@/components/ui/tags-input";
import { Textarea } from "@/components/ui/textarea";
import { useFormDirtyState } from "@/hooks/use-form-dirty-state";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import type { useCustomerAgent } from "@/hooks/use-customer-agent";
import {
  behaviorFormSchema,
  type AgentGoal,
  type AgentTone,
  type BehaviorValues,
  type CustomerAgentConfig,
} from "@/types/customer-agent";
import { ChoiceGroup, FieldRow, fieldError } from "./controls";
import { SaveBar } from "./SaveBar";
import { Section } from "./Section";

interface BehaviorTabProps {
  businessId: string;
  config: CustomerAgentConfig;
  update: ReturnType<typeof useCustomerAgent>["update"];
}

const TONES: { value: AgentTone; label: string; hint: string }[] = [
  { value: "friendly", label: "Friendly", hint: "Warm and conversational, like a helpful front desk." },
  { value: "professional", label: "Professional", hint: "Polished and precise. No small talk." },
  { value: "concise", label: "Concise", hint: "Short, direct answers. Best for busy visitors." },
];

const GOALS: { value: AgentGoal; label: string }[] = [
  { value: "book", label: "Book a visit" },
  { value: "call", label: "Call you" },
  { value: "quote", label: "Request a quote" },
];

const ESCALATION_TRIGGERS = [
  { key: "on_request", label: "The visitor asks for a person" },
  { key: "on_low_confidence", label: "The agent isn't sure of the answer" },
  { key: "on_complaint", label: "The visitor is upset or has a complaint" },
] as const;

function pickBehavior({ behavior }: CustomerAgentConfig): BehaviorValues {
  return { behavior };
}

const nullIfBlank = (value: string) => (value.trim() ? value.trim() : null);

function normalize(values: BehaviorValues): BehaviorValues {
  return {
    behavior: {
      ...values.behavior,
      booking_url: values.behavior.booking_url && nullIfBlank(values.behavior.booking_url),
      quote_url: values.behavior.quote_url && nullIfBlank(values.behavior.quote_url),
      escalation: { ...values.behavior.escalation, instructions: values.behavior.escalation.instructions.trim() },
    },
  };
}

export function BehaviorTab({ businessId, config, update }: BehaviorTabProps) {
  const savedRef = useRef(pickBehavior(config));

  const form = useForm({
    defaultValues: savedRef.current,
    validators: { onChange: behaviorFormSchema },
    onSubmit: async ({ value }) => {
      const next = normalize(value);
      try {
        await update.mutateAsync({ changes: next, successMessage: "Behavior saved" });
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
  const isSubmitting = useStore(form.store, (state) => state.isSubmitting);
  const goal = useStore(form.store, (state) => state.values.behavior.goal);
  const tone = useStore(form.store, (state) => state.values.behavior.tone);

  const handleReset = () => {
    form.reset(savedRef.current);
    resetBaseline(savedRef.current);
  };

  const { phone } = config.business;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
      className="flex max-w-[752px] flex-col gap-4"
    >
      <Section title="Voice and goal" description="How your agent talks, and what it steers visitors toward.">
        <div className="space-y-5">
          <form.Field name="behavior.tone">
            {(field) => (
              <FieldRow label="Tone" hint={TONES.find((item) => item.value === tone)?.hint}>
                <ChoiceGroup label="Tone" value={field.state.value} options={TONES} onChange={field.handleChange} />
              </FieldRow>
            )}
          </form.Field>
          <form.Field name="behavior.goal">
            {(field) => (
              <FieldRow
                label="Main goal"
                hint={
                  goal === "call" && !phone
                    ? "Add a phone number to your Profile so visitors can call."
                    : "The agent suggests this when the visitor seems ready."
                }
              >
                <ChoiceGroup label="Main goal" value={field.state.value} options={GOALS} onChange={field.handleChange} />
              </FieldRow>
            )}
          </form.Field>
        </div>
      </Section>

      <Section title="Links and contact" description="Where the agent sends visitors who are ready to act.">
        <div className="space-y-5">
          <form.Field name="behavior.booking_url">
            {(field) => (
              <FieldRow
                label="Booking link"
                htmlFor={field.name}
                hint={goal === "book" ? "Required while booking is the main goal." : "Optional. Turns on the Book button."}
                error={fieldError(field.state.meta.errors)}
              >
                <Input
                  id={field.name}
                  type="url"
                  inputMode="url"
                  placeholder="https://calendly.com/your-business"
                  value={field.state.value ?? ""}
                  onChange={(event) => field.handleChange(event.target.value || null)}
                  onBlur={field.handleBlur}
                  aria-invalid={field.state.meta.errors.length > 0}
                />
              </FieldRow>
            )}
          </form.Field>
          <form.Field name="behavior.quote_url">
            {(field) => (
              <FieldRow
                label="Quote form link"
                htmlFor={field.name}
                hint="Optional. Turns on the Quote button."
                error={fieldError(field.state.meta.errors)}
              >
                <Input
                  id={field.name}
                  type="url"
                  inputMode="url"
                  placeholder="https://your-site.com/quote"
                  value={field.state.value ?? ""}
                  onChange={(event) => field.handleChange(event.target.value || null)}
                  onBlur={field.handleBlur}
                  aria-invalid={field.state.meta.errors.length > 0}
                />
              </FieldRow>
            )}
          </form.Field>
          <FieldRow label="Phone" hint="From your Profile.">
            <div className="flex h-9 items-center justify-between gap-3 rounded-md border border-general-border px-3">
              <span className={phone ? "text-sm text-general-foreground" : "text-sm text-general-muted-foreground"}>
                {phone ?? "Not set"}
              </span>
              <Link
                href={`/business/${businessId}/profile`}
                className="text-sm text-general-muted-foreground underline-offset-2 hover:text-general-foreground hover:underline"
              >
                Edit in Profile
              </Link>
            </div>
          </FieldRow>
        </div>
      </Section>

      <Section title="Topics to avoid" description="The agent politely declines these and offers to connect the visitor with you.">
        <form.Field name="behavior.topics_to_avoid">
          {(field) => (
            <FieldRow label="Topics" hint="Press Enter after each topic." error={fieldError(field.state.meta.errors)}>
              <TagsInput
                value={field.state.value}
                onChange={field.handleChange}
                maxItems={20}
                placeholder="Pricing for commercial jobs, competitor comparisons"
              />
            </FieldRow>
          )}
        </form.Field>
      </Section>

      <Section
        title="Hand off to a person"
        description="When the agent should offer to connect the visitor with your team."
      >
        <div className="space-y-4">
          <div className="space-y-2.5">
            {ESCALATION_TRIGGERS.map((trigger) => (
              <form.Field key={trigger.key} name={`behavior.escalation.${trigger.key}`}>
                {(field) => (
                  <label className="flex items-center gap-2 text-sm text-general-foreground">
                    <Checkbox
                      checked={field.state.value}
                      onCheckedChange={(checked) => field.handleChange(checked === true)}
                    />
                    {trigger.label}
                  </label>
                )}
              </form.Field>
            ))}
          </div>
          <form.Field name="behavior.escalation.instructions">
            {(field) => (
              <FieldRow
                label="Other rules"
                htmlFor={field.name}
                hint="Optional. For example: hand off any emergency like flooding or a gas smell."
                error={fieldError(field.state.meta.errors)}
              >
                <Textarea
                  id={field.name}
                  rows={3}
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                />
              </FieldRow>
            )}
          </form.Field>
        </div>
      </Section>

      <SaveBar isDirty={isDirty} isSubmitting={isSubmitting} onReset={handleReset} />
    </form>
  );
}
