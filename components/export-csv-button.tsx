"use client";

import { Button } from "@/components/button";

/**
 * Downloads the rows already on screen as CSV, in the browser. Nothing is
 * generated server-side, so the button can never disagree with what the page
 * shows.
 */
export function ExportCsvButton({
  filename,
  rows,
}: {
  filename: string;
  rows: string[][];
}) {
  function download() {
    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${cell.replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\r\n");

    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="secondary" onClick={download}>
      Exportar CSV
    </Button>
  );
}
