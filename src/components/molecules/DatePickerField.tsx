"use client";

import * as React from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  id?: string;
  minDate?: string;
  maxDate?: string;
  clearable?: boolean;
  required?: boolean;
  className?: string;
}

function parseDate(value?: string) {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function serializeDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  return parseDate(value)?.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DatePickerField({
  value,
  onChange,
  placeholder,
  id,
  minDate,
  maxDate,
  clearable = false,
  required = false,
  className,
}: DatePickerFieldProps) {
  const [open, setOpen] = React.useState(false);
  const minimum = parseDate(minDate);
  const maximum = parseDate(maxDate);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-required={required}
          className={cn("h-10 w-full justify-start gap-2 rounded-[8px] px-3 font-normal", className)}
        >
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
          <span className={cn("truncate", value ? "text-general-foreground" : "text-muted-foreground")}>
            {value ? formatDate(value) : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="z-[60] w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={parseDate(value)}
          onSelect={date => {
            if (date) onChange(serializeDate(date));
            setOpen(false);
          }}
          disabled={date => Boolean((minimum && date < minimum) || (maximum && date > maximum))}
          captionLayout="dropdown"
        />
        {clearable && value ? (
          <div className="border-t border-general-border p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              Clear date
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
