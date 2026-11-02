import type { ReactNode } from "react";

import { cn } from "@/components/cn";

/**
 * design/system.md — the single table implementation.
 *
 * Header row 44 with `micro` uppercase `--sage-dim` labels, data rows 56,
 * hairline separators, no zebra. Cell typography is delegated to the page
 * through `cellCode` / `cellDest` / `cellClicks` / `cellMeta`, so a count is
 * always `data-m` right-aligned and a code is always `data-m --lime`.
 */
export type DataTableColumn<T> = {
  key: string;
  header: ReactNode;
  /** Fixed column width, rendered through `<colgroup>`. */
  width?: string;
  align?: "left" | "right";
  cell: (row: T) => ReactNode;
};

export type DataTableProps<T> = {
  columns: Array<DataTableColumn<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  className?: string;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  className,
}: DataTableProps<T>) {
  return (
    <table
      className={cn("w-full table-fixed border-collapse text-left", className)}
    >
      <colgroup>
        {columns.map((column) => (
          <col key={column.key} style={column.width ? { width: column.width } : undefined} />
        ))}
      </colgroup>
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              className={cn(
                "h-11 border-b border-line px-6 text-micro font-medium uppercase text-sage-dim",
                column.align === "right" && "text-right",
              )}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={rowKey(row)}
            className="h-14 border-b border-line last:border-b-0 hover:bg-raised"
          >
            {columns.map((column) => (
              <td
                key={column.key}
                className={cn(
                  "h-14 px-6 align-middle",
                  column.align === "right" && "text-right",
                )}
              >
                {column.cell(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Code cells: `data-m`, lime, tabular numerals. */
export const cellCode = "font-mono text-data-m tabular-nums text-lime";

/** Destination cells: `small` secondary text, truncated to one line. */
export const cellDest = "block truncate text-small text-sage";

/** Count cells: `data-m`, right-aligned, tabular numerals. */
export const cellClicks = "font-mono text-data-m tabular-nums text-bone";

/** Metadata cells: `data-s --sage-dim`. */
export const cellMeta = "whitespace-nowrap font-mono text-data-s tabular-nums text-sage-dim";
