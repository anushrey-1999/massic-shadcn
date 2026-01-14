"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { cn } from "@/lib/utils";

interface DataTableSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}

export function DataTableSearch({
  value,
  onChange,
  placeholder = "Search all columns...",
  debounceMs = 400,
  className,
}: DataTableSearchProps) {
  const [localValue, setLocalValue] = React.useState(value);
  const isFocusedRef = React.useRef(false);

  React.useEffect(() => {
    if (isFocusedRef.current) return;
    setLocalValue(value);
  }, [value]);

  const debouncedOnChange = useDebouncedCallback(onChange, debounceMs);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    if (debounceMs <= 0) {
      onChange(newValue);
      return;
    }
    debouncedOnChange(newValue);
  };

  const handleClear = () => {
    setLocalValue("");
    onChange("");
  };

  return (
    <div className={cn("relative w-full max-w-sm", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        value={localValue}
        onChange={handleChange}
        onFocus={() => {
          isFocusedRef.current = true;
        }}
        onBlur={() => {
          isFocusedRef.current = false;
          setLocalValue(value);
        }}
        placeholder={placeholder}
        className="h-9 pl-9 pr-10"
      />
      {localValue && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 p-0"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Clear search</span>
        </Button>
      )}
    </div>
  );
}
