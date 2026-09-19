"use client";

import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { gbcApi } from "@/gbc/apiClient";
import type { GBCEdition } from "@/gbc/utils/settings";

/** Loads the edition list the first time `enabled` turns true (e.g. when a dialog opens). */
export function useEditions(enabled: boolean) {
  const [editions, setEditions] = useState<GBCEdition[]>([]);

  useEffect(() => {
    if (!enabled || editions.length > 0) return;
    gbcApi.editions.list().then((res) => {
      if (res.success) setEditions(res.data);
    });
  }, [enabled, editions.length]);

  return editions;
}

/**
 * Edition dropdown for admin forms.
 *
 * Two Radix Select quirks shape this (installed 2.2.6):
 * - Passing children to <SelectValue> throws a ref/portal error, so the
 *   trigger shows a plain <span> label and Select only holds the value.
 * - Its hidden native <select> syncs `value` before the <option>s register,
 *   reads back "" and fires onValueChange(""). The guard below drops that, and
 *   callers should preselect a default in an effect *after* the list renders
 *   rather than in the same batch as the list.
 */
export function EditionSelect({
  editions,
  value,
  onChange,
  disabled,
}: {
  editions: GBCEdition[];
  value: string;
  onChange: (key: string) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value}
      onValueChange={(key) => key && onChange(key)}
      disabled={disabled || editions.length === 0}
    >
      <SelectTrigger aria-label="Edition">
        <span className={value ? "" : "text-slate-500 dark:text-slate-400"}>
          {editions.find((e) => e.key === value)?.name ?? (value || "Select edition")}
        </span>
      </SelectTrigger>
      <SelectContent>
        {editions.map((edition) => (
          <SelectItem key={edition.key} value={edition.key}>
            {edition.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
