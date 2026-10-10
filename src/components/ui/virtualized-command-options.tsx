"use client";

import * as React from "react";
import {
  List as ReactWindowList,
  useListRef,
} from "react-window";

import { Checkbox } from "@/components/ui/checkbox";
import { CommandGroup, CommandItem } from "@/components/ui/command";

export type VirtualizedCommandOption = {
  value: string;
  label: string;
};

type VirtualizedCommandRowProps = {
  options: VirtualizedCommandOption[];
  selectedValues: ReadonlySet<string>;
  onSelect: (value: string) => void;
};

function VirtualizedCommandRow({
  ariaAttributes,
  index,
  style,
  options,
  selectedValues,
  onSelect,
}: {
  ariaAttributes: {
    "aria-posinset": number;
    "aria-setsize": number;
    role: "listitem";
  };
  index: number;
  style: React.CSSProperties;
} & VirtualizedCommandRowProps) {
  const option = options[index];
  const isSelected = selectedValues.has(option.value);

  return (
    <div {...ariaAttributes} style={style}>
      <CommandItem
        value={`${option.label} ${option.value}`}
        onSelect={() => onSelect(option.value)}
        className="flex h-8 cursor-pointer items-center overflow-hidden px-2 py-1"
      >
        <Checkbox
          checked={isSelected}
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none mr-2"
        />
        <span className="block min-w-0 flex-1 truncate text-xs" title={option.label}>
          {option.label}
        </span>
      </CommandItem>
    </div>
  );
}

export function VirtualizedCommandOptions({
  options,
  selectedValues,
  onSelect,
  maxHeight = 256,
  itemHeight = 32,
}: VirtualizedCommandRowProps & {
  maxHeight?: number;
  itemHeight?: number;
}) {
  const listRef = useListRef(null);
  const height = Math.min(
    maxHeight,
    Math.max(itemHeight, options.length * itemHeight)
  );
  const firstSelectedIndex = options.findIndex((option) =>
    selectedValues.has(option.value)
  );

  React.useEffect(() => {
    if (firstSelectedIndex < 0) return;
    let scrollFrame = 0;
    const mountFrame = requestAnimationFrame(() => {
      scrollFrame = requestAnimationFrame(() => {
        listRef.current?.scrollToRow({
          index: firstSelectedIndex,
          align: "center",
          behavior: "instant",
        });
      });
    });
    return () => {
      cancelAnimationFrame(mountFrame);
      cancelAnimationFrame(scrollFrame);
    };
  }, [firstSelectedIndex, listRef]);

  return (
    <CommandGroup className="p-0">
      <ReactWindowList<VirtualizedCommandRowProps>
        listRef={listRef}
        style={{ height, width: "100%" }}
        rowHeight={itemHeight}
        rowCount={options.length}
        overscanCount={8}
        rowComponent={VirtualizedCommandRow}
        rowProps={{ options, selectedValues, onSelect }}
      />
    </CommandGroup>
  );
}
