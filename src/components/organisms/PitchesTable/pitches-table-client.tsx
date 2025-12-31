"use client";

import * as React from "react";

import { PitchesTable } from "./pitches-table";

export function PitchesTableClient() {
  const data = React.useMemo(() => [], []);

  return (
    <PitchesTable
      data={data}
      pageCount={1}
      isLoading={false}
    />
  );
}
