import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

import { cn } from "@/components/cn";

/**
 * design/system.md — Field, Input and the one select control.
 *
 * Field: `micro` uppercase `--sage-dim` label above, 8px gap, then the input.
 * Input: 44 tall, `--raised` background, 1px `--line-strong`, radius 8, `body`
 * text, `--sage-dim` placeholder. Focus (and the error state) come from the
 * global rules in `globals.css` / the `border-rust` override below.
 *
 * `size="sm"` is the 40px toolbar height used by the admin filter rows.
 */
export type FieldProps = {
  label: string;
  htmlFor: string;
  error?: string | null;
  children: ReactNode;
  className?: string;
};

export function Field({
  label,
  htmlFor,
  error,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label
        className="text-micro font-medium uppercase text-sage-dim"
        htmlFor={htmlFor}
      >
        {label}
      </label>
      {children}
      {error ? <p className="text-small text-rust">{error}</p> : null}
    </div>
  );
}

export type InputSize = "sm" | "md";

export function inputClassName(
  size: InputSize = "md",
  invalid = false,
  className?: string,
): string {
  return cn(
    "rounded-md border bg-raised px-4 text-bone placeholder:text-sage-dim",
    size === "sm" ? "h-10 text-small" : "h-11 text-body",
    invalid ? "border-rust" : "border-line-strong",
    className,
  );
}

/** `size` is the control height here, not the HTML `size` attribute. */
export type InputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size"
> & {
  size?: InputSize;
  invalid?: boolean;
};

export function Input({
  size = "md",
  invalid = false,
  className,
  ...props
}: InputProps) {
  return (
    <input
      className={inputClassName(size, invalid, className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

/** The filter control of the admin index: same skin as `Input`. */
export function Select({ className, children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-10 w-full cursor-pointer appearance-none rounded-md border border-line-strong bg-raised pl-3 pr-8 text-small text-bone",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 12 12"
        className="pointer-events-none absolute right-3 top-1/2 size-3 -translate-y-1/2 text-sage-dim"
      >
        <path
          d="M2.5 4.5L6 8L9.5 4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
