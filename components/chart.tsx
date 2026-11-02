import { cn } from "@/components/cn";

/**
 * design/system.md — Chart: bars with a 2px top radius in `--lime`, zero days
 * as a 2px `--line` stub, axis labels in `data-s --sage-dim`. The current day
 * is `--lime` at 100%, history at 65%. Bars grow from the baseline once, 320ms,
 * staggered 8ms per bar; that animation lives in `globals.css` and is disabled
 * under `prefers-reduced-motion`.
 */
export type ChartPoint = { date: string; count: number };

export type ChartProps = {
  points: ChartPoint[];
  /** Two to four labels, spread with `justify-between` under the baseline. */
  axisLabels: string[];
  /**
   * `thin` is the 6px bar of the link detail; `fluid` lets wide ranges keep the
   * 14px cap and narrow the bars as the series grows.
   */
  barWidth?: "thin" | "fluid";
  /** Plot height in pixels, matching the approved screen for the route. */
  height?: number;
  label: string;
};

export function Chart({
  points,
  axisLabels,
  barWidth = "fluid",
  height = 160,
  label,
}: ChartProps) {
  const max = Math.max(1, ...points.map((point) => point.count));
  const lastIndex = points.length - 1;
  const isCurrentDay = (index: number) => index === lastIndex;

  return (
    <figure className="m-0">
      <div
        role="img"
        aria-label={label}
        className="flex items-end gap-1.5 border-b border-line"
        style={{ height }}
      >
        {points.map((point, index) => {
          const zero = point.count === 0;
          return (
            <div
              key={point.date}
              className="flex h-full flex-1 items-end justify-center"
            >
              <div
                className={cn(
                  "bar-grow w-full",
                  barWidth === "thin" ? "max-w-1.5" : "max-w-3.5",
                  zero
                    ? "rounded-t-none bg-line"
                    : cn(
                        "rounded-t-[2px] bg-lime",
                        isCurrentDay(index) ? "opacity-100" : "opacity-[0.65]",
                      ),
                )}
                style={{
                  height: zero
                    ? 2
                    : Math.max(2, Math.round((point.count / max) * height)),
                  animationDelay: `${index * 8}ms`,
                }}
              />
            </div>
          );
        })}
      </div>
      <figcaption className="flex justify-between pt-2">
        {axisLabels.map((axisLabel) => (
          <span
            key={axisLabel}
            className="font-mono text-data-s tabular-nums text-sage-dim"
          >
            {axisLabel}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
