import type { ReactNode } from "react";

import { cn } from "@/components/cn";

/**
 * design/system.md — the single table implementation.
 *
 * Header row 44 with `micro` uppercase `--sage-dim` labels, data rows 56,
 * hairline separators, no zebra. Cell typography is delegated to the page
 * through `cellCode` / `cellDest` / `cellClicks` / `cellMeta`, so a count is
 * always `data-m` right-aligned and a code is always `data-m --lime`.
 *
 * Padding is one value — 24 horizontal on every cell, header included — so the
 * first and last cells line up with the 24 padding of the `Card` the table sits
 * in. A column that holds a control therefore has to be at least
 * 24 + control + 24 wide; that is why the action columns are declared at 96.
 * Narrow screens scroll the table inside its card instead of clipping it.
 */
const CELL_PADDING = "px-6";

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
    <div className="w-full overflow-x-auto">
      <table
        className={cn(
          // Auto layout below `lg`, where the declared column widths cannot fit:
          // the card scrolls the table sideways instead of squeezing every cell
          // until the labels collide.
          "w-full table-auto border-collapse text-left lg:table-fixed",
          className,
        )}
      >
        <colgroup>
          {columns.map((column) => (
            <col
              key={column.key}
              style={column.width ? { width: column.width } : undefined}
            />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "h-11 border-b border-line text-micro font-medium uppercase text-sage-dim",
                  CELL_PADDING,
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
                    "h-14 align-middle",
                    CELL_PADDING,
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
    </div>
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
