"use client";

import { Loader2 } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: (id: string) => React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-semibold">
        {label}
      </label>
      {children(id)}
      {hint && <p className="text-[12px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border bg-card px-3.5 py-2.5 text-[15px] outline-none placeholder:text-muted-foreground focus:border-foreground/40 disabled:opacity-60";

export function TextInput(props: React.ComponentProps<"input">) {
  return (
    <input {...props} className={cn(inputClass, "h-11", props.className)} />
  );
}

export function TextArea(props: React.ComponentProps<"textarea">) {
  return (
    <textarea
      rows={4}
      {...props}
      className={cn(inputClass, "min-h-24 resize-y", props.className)}
    />
  );
}

export function PrimaryButton({
  pending,
  children,
  className,
  ...props
}: React.ComponentProps<"button"> & { pending?: boolean }) {
  return (
    <button
      type="submit"
      {...props}
      disabled={pending || props.disabled}
      className={cn(
        "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand px-6 text-[15px] font-bold text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-50",
        className,
      )}
    >
      {pending && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((o) => (
        // biome-ignore lint/a11y/useSemanticElements: pill buttons styled as a segmented control
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-9 rounded-full border px-4 text-[14px] font-medium transition-colors",
            value === o.value
              ? "border-foreground bg-foreground text-background"
              : "bg-card hover:border-foreground/30",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span>
        <span className="block text-[14px] font-medium">{label}</span>
        {hint && (
          <span className="block text-[12px] text-muted-foreground">
            {hint}
          </span>
        )}
      </span>
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-full transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
          checked ? "bg-brand" : "bg-muted-foreground/30",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform",
            checked && "translate-x-4",
          )}
        />
      </span>
    </label>
  );
}
