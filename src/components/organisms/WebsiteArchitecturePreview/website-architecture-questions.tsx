"use client";

import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Check, ChevronDown, MessageSquare } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MassicAmoebaLoader } from "@/components/ui/massic-amoeba-loader";
import { Textarea } from "@/components/ui/textarea";
import { useFeatureActionGuard } from "@/hooks/use-permissions";
import type { ArchitectureAnsweredRound, ArchitectureQuestionRound } from "@/types/website-architecture-content-types";
import { Markdown } from "./architecture-section-fields";

const actionClass = "w-full transition-colors focus-visible:ring-2 focus-visible:ring-general-primary active:opacity-80 disabled:opacity-60 motion-reduce:transition-none sm:w-auto";

function QuestionMarkdown({ text }: { text: string }) {
  return (
    <Markdown
      text={text}
      className="space-y-3 break-words text-sm leading-relaxed [&_ol]:space-y-1 [&_p]:whitespace-pre-line [&_ul]:space-y-1"
    />
  );
}

function QuestionContext({ text }: { text: string | null }) {
  if (!text?.trim()) return null;

  return (
    <details className="group/context rounded-md bg-muted/60 text-muted-foreground">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-general-primary [&::-webkit-details-marker]:hidden">
        Request context
        <ChevronDown aria-hidden className="size-4 shrink-0 group-open/context:rotate-180" />
      </summary>
      <div className="border-t px-3 py-3">
        <QuestionMarkdown text={text} />
      </div>
    </details>
  );
}

export function ArchitectureQuestions({ round, submit, refresh, reading, readFailed }: {
  round: ArchitectureQuestionRound;
  submit: (answers: string[]) => Promise<void>;
  refresh: () => Promise<boolean>;
  reading: boolean;
  readFailed: boolean;
}) {
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const locked = useRef(false);
  const guardGenerate = useFeatureActionGuard("web.generatePage");
  const [answers, setAnswers] = useState(() => round.questions.map(() => ""));
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const mutation = useMutation({ mutationFn: submit, retry: false });
  const busy = mutation.isPending || checking || mutation.isSuccess;
  const valid = round.questions.every((question, index) => !question.required || answers[index]?.trim());

  useEffect(() => { heading.current?.focus(); }, []);

  async function checkLatest() {
    setChecking(true);
    try {
      return await refresh();
    } finally {
      setChecking(false);
    }
  }

  async function sendAnswers() {
    if (locked.current || !valid || reading || readFailed || !guardGenerate()) return;
    locked.current = true;
    setError("");
    try {
      await mutation.mutateAsync(answers.map((answer) => answer.trim()));
    } catch (error) {
      const conflict = isAxiosError(error) && error.response?.status === 409;
      if (await checkLatest()) {
        setError(conflict
          ? "The server rejected these answers. Review the questions and try again."
          : "Massic couldn’t confirm your answers. Review them and try again.");
      }
      locked.current = false;
    }
  }

  return (
    <section className="max-w-2xl rounded-lg border bg-background" aria-labelledby={`${id}-heading`}>
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b px-4 py-4 sm:px-6">
        <h2 id={`${id}-heading`} tabIndex={-1} ref={heading} className="flex items-center gap-2 rounded-sm text-base font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-general-primary">
          <MessageSquare aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          {round.questions.length === 1 ? "One question before we continue" : "A few questions before we continue"}
        </h2>
        {round.questions.some((question) => question.required) && (
          <p className="text-xs text-muted-foreground">
            <span aria-hidden className="font-medium text-destructive">*</span> Required fields
          </p>
        )}
      </header>
      <form aria-busy={busy} onSubmit={(event) => {
        event.preventDefault();
        void sendAnswers();
      }}>
        <div className="divide-y px-4 sm:px-6">
          {round.questions.map((question, index) => {
            const fieldId = `${id}-answer-${index}`;
            return (
              <div key={fieldId} className="space-y-2 py-4">
                <div className="space-y-1.5">
                  <div id={`${fieldId}-question`} className="flex min-w-0 items-start gap-1.5">
                    {question.required && <span aria-hidden className="shrink-0 text-sm font-medium leading-relaxed text-destructive">*</span>}
                    <QuestionMarkdown text={question.text} />
                  </div>
                  {!question.required && <span id={`${fieldId}-optional`} className="text-xs text-muted-foreground">Optional</span>}
                </div>
                <Textarea
                  id={fieldId}
                  aria-labelledby={`${fieldId}-question`}
                  aria-describedby={question.required ? undefined : `${fieldId}-optional`}
                  required={question.required}
                  rows={3}
                  placeholder="Your answer"
                  value={answers[index]}
                  disabled={busy}
                  className="border-general-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-general-primary disabled:opacity-90 motion-reduce:transition-none"
                  onChange={(event) => {
                    const value = event.target.value;
                    setAnswers((previous) => previous.map((answer, fieldIndex) => fieldIndex === index ? value : answer));
                    setError("");
                  }}
                />
              </div>
            );
          })}
        </div>
        {round.context?.trim() && (
          <div className="px-4 pb-4 sm:px-6"><QuestionContext text={round.context} /></div>
        )}
        <div className="space-y-3 border-t px-4 py-4 sm:px-6">
          {readFailed && <p role="alert" className="text-sm text-destructive">Couldn’t check whether these questions are still open. Your answers are kept here.</p>}
          {!readFailed && error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {readFailed ? (
            <Button type="button" variant="outline" disabled={checking || reading} onClick={() => void checkLatest()} className={actionClass}>
              {checking && <MassicAmoebaLoader size={16} label={null} />}
              {checking ? "Checking…" : "Check again"}
            </Button>
          ) : (
            <Button type="submit" disabled={!valid || busy || reading} className={actionClass}>
              {(busy || reading) && <MassicAmoebaLoader size={16} label={null} />}
              {checking || reading ? "Checking questions…" : busy ? "Submitting answers…" : "Submit answers"}
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}

export function ArchitectureQuestionHistory({ rounds }: { rounds: ArchitectureAnsweredRound[] }) {
  if (!rounds.length) return null;

  return (
    <details className="group/history w-full min-w-0 rounded-lg border bg-background">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-4 py-4 text-sm font-medium hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-general-primary active:bg-muted sm:px-8 [&::-webkit-details-marker]:hidden">
        <Check aria-hidden className="size-4 text-muted-foreground" />
        Answered questions
        <ChevronDown aria-hidden className="ml-auto size-4 text-muted-foreground group-open/history:rotate-180" />
      </summary>
      <ol className="divide-y border-t px-4 sm:px-8">
        {rounds.map((round) => (
          <li key={`${round.asked_at}-${round.answered_at}`} className="space-y-4 py-5">
            <dl className="space-y-4 text-sm">
              {round.questions.map((question, index) => (
                <div key={index} className="space-y-2">
                  <dt><QuestionMarkdown text={question.text} /></dt>
                  <dd className="space-y-1 rounded-md bg-muted/60 px-3 py-2.5">
                    <p className="text-xs font-medium text-muted-foreground">Your answer</p>
                    <p className="whitespace-pre-wrap break-words">{question.answer.trim() ? question.answer : "Skipped"}</p>
                  </dd>
                </div>
              ))}
            </dl>
            <QuestionContext text={round.context} />
          </li>
        ))}
      </ol>
    </details>
  );
}
