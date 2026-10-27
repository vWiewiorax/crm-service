"use client";

import { useId } from "react";
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
  type Path,
  type UseFormSetError,
} from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";

const NONE = "__none";

type Base<T extends FieldValues> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<T, any, any>;
  name: Path<T>;
  label: string;
  description?: React.ReactNode;
  required?: boolean;
  className?: string;
  disabled?: boolean;
};

function Label({ htmlFor, label, required }: { htmlFor: string; label: string; required?: boolean }) {
  return (
    <FieldLabel htmlFor={htmlFor}>
      {label}
      {required && (
        <span className="text-destructive" aria-hidden>
          *
        </span>
      )}
    </FieldLabel>
  );
}

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  required,
  className,
  disabled,
  type = "text",
  placeholder,
  inputMode,
  autoComplete,
  suffix,
}: Base<T> & {
  type?: string;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  suffix?: string;
}) {
  const id = useId();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={className}>
          <Label htmlFor={id} label={label} required={required} />
          <div className="relative">
            <Input
              {...field}
              id={id}
              value={(field.value as string | undefined) ?? ""}
              type={type}
              placeholder={placeholder}
              inputMode={inputMode}
              autoComplete={autoComplete}
              disabled={disabled}
              aria-invalid={fieldState.invalid}
              aria-required={required}
              className={cn("bg-card", suffix && "pr-12")}
            />
            {suffix && (
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                {suffix}
              </span>
            )}
          </div>
          {description && <FieldDescription>{description}</FieldDescription>}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}

export function TextareaField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  required,
  className,
  rows = 4,
  placeholder,
}: Base<T> & { rows?: number; placeholder?: string }) {
  const id = useId();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={className}>
          <Label htmlFor={id} label={label} required={required} />
          <Textarea
            {...field}
            id={id}
            rows={rows}
            placeholder={placeholder}
            value={(field.value as string | undefined) ?? ""}
            aria-invalid={fieldState.invalid}
            className="bg-card"
          />
          {description && <FieldDescription>{description}</FieldDescription>}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  required,
  className,
  disabled,
  options,
  placeholder = "Wybierz...",
  emptyOption,
  onValueChange,
}: Base<T> & {
  options: readonly { value: string; label: string }[];
  placeholder?: string;
  /** Etykieta opcji "brak" dla pól opcjonalnych (zapisuje pusty tekst). */
  emptyOption?: string;
  onValueChange?: (value: string) => void;
}) {
  const id = useId();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={className}>
          <Label htmlFor={id} label={label} required={required} />
          <Select
            value={(field.value as string) || (emptyOption ? NONE : "")}
            disabled={disabled}
            onValueChange={(v) => {
              const value = v === NONE ? "" : v;
              field.onChange(value);
              onValueChange?.(value);
            }}
          >
            <SelectTrigger id={id} aria-invalid={fieldState.invalid} className="w-full bg-card" onBlur={field.onBlur}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {emptyOption && <SelectItem value={NONE}>{emptyOption}</SelectItem>}
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description && <FieldDescription>{description}</FieldDescription>}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}

/** Przenosi błędy walidacji zwrócone przez serwer do pól formularza. */
export function applyServerErrors<T extends FieldValues>(setError: UseFormSetError<T>, result: ActionResult<unknown>) {
  if (result.ok || !result.fieldErrors) return;
  for (const [key, messages] of Object.entries(result.fieldErrors)) {
    if (!messages?.length || key === "_form") continue;
    setError(key as FieldPath<T>, { type: "server", message: messages[0] });
  }
}

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-6 border-b py-6 first:pt-0 last:border-b-0 last:pb-0 lg:grid-cols-[16rem_1fr]">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
