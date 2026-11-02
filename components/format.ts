/**
 * Formatting shared by the server pages and the client forms. Pure functions
 * only: no database, no request scope, so both sides can import them.
 */

const LOCALE = "es-AR";

const NUMBER = new Intl.NumberFormat(LOCALE);
const DECIMAL = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** 1284 -> "1.284" */
export function formatNumber(value: number): string {
  return NUMBER.format(Math.round(value));
}

/** 34.7 -> "34,7" (averages keep their decimals) */
export function formatDecimal(value: number): string {
  return DECIMAL.format(value);
}

/** `YYYY-MM-DD` of an instant in a time zone, matching the analytics buckets. */
export function localDateKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** `HH:MM` of an instant in a time zone. */
export function formatTimeOfDay(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

/** "hace 2 min", "hace 3 h", "hace 12 d". */
export function formatRelativeTime(
  iso: string,
  now: number = Date.now(),
): string {
  const instant = new Date(iso).getTime();
  if (Number.isNaN(instant)) {
    return "—";
  }

  const seconds = Math.max(0, Math.round((now - instant) / 1000));
  if (seconds < 60) {
    return "ahora";
  }

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `hace ${minutes} min`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `hace ${hours} h`;
  }

  return `hace ${Math.round(hours / 24)} d`;
}

/**
 * The compact form of `formatRelativeTime`, for a `data-l` stat value: the
 * closed type scale has no 26px step, so a phrase like "hace 2 min" would wrap
 * inside a quarter-width card.
 */
export function formatCompactRelativeTime(
  iso: string,
  now: number = Date.now(),
): string {
  const instant = new Date(iso).getTime();
  if (Number.isNaN(instant)) {
    return "—";
  }

  const minutes = Math.max(0, Math.round((now - instant) / 60000));
  if (minutes < 1) {
    return "ahora";
  }
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours} h`;
  }

  return `${Math.round(hours / 24)} d`;
}

/** "hace 2 minutos", "hace 12 días": the full sentence, for a top-bar meta line. */
export function formatRelativeTimeLong(
  iso: string,
  now: number = Date.now(),
): string {
  const instant = new Date(iso).getTime();
  if (Number.isNaN(instant)) {
    return "—";
  }

  const minutes = Math.max(0, Math.round((now - instant) / 60000));
  if (minutes < 1) {
    return "hace un momento";
  }
  if (minutes < 60) {
    return `hace ${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `hace ${hours} ${hours === 1 ? "hora" : "horas"}`;
  }

  const days = Math.round(hours / 24);
  return `hace ${days} ${days === 1 ? "día" : "días"}`;
}

/** `YYYY-MM-DD` (already in the analytics time zone) -> "1 may". */
export function formatDayMonth(isoDate: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  })
    .format(new Date(`${isoDate}T00:00:00Z`))
    .replace(/\.$/, "");
}

/** `YYYY-MM-DD` -> "lunes 26 de mayo". */
export function formatLongDay(isoDate: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(new Date(`${isoDate}T00:00:00Z`))
    .replace(",", "");
}

/** `YYYY-MM-DD` -> "lunes 26 may", the short form of the detail rail. */
export function formatShortDay(isoDate: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "short",
  })
    .format(new Date(`${isoDate}T00:00:00Z`))
    .replace(",", "")
    .replace(/\.$/, "");
}

/** Index 0 is Sunday, matching the Postgres `dow` used by the analytics API. */
const WEEKDAYS_LONG = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

const WEEKDAYS_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

/** Monday-first display order for a Sunday-first data series. */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function weekdayLong(index: number): string {
  return WEEKDAYS_LONG[index] ?? "—";
}

export function weekdayShort(index: number): string {
  return WEEKDAYS_SHORT[index] ?? "—";
}

/** The difference of two daily counts, phrased as a delta against yesterday. */
export function formatDelta(difference: number): string {
  if (difference > 0) {
    return `↑ ${formatNumber(difference)} vs. ayer`;
  }
  if (difference < 0) {
    return `↓ ${formatNumber(Math.abs(difference))} vs. ayer`;
  }
  return "= vs. ayer";
}
