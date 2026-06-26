"use client";

import type { FormEvent, ReactNode } from "react";
import {
  Description,
  FieldError,
  Fieldset,
  Form,
  Input,
  Label,
  TextArea,
  TextField,
} from "@/shared/ui/hero-form";
import { cn } from "@/shared/core/utils";
import type { MentrixaFormMessage } from "@/shared/ui/form-messages-pure";

export type MentrixaFormTone = "light" | "dark";

const TONE_CLASS: Record<MentrixaFormTone, string> = {
  light: "mentrixa-form--light",
  dark: "mentrixa-form--dark",
};

function FormMessageFooter({ message }: { message?: MentrixaFormMessage | null }) {
  if (!message?.verdict && !message?.nextAction) return null;
  return (
    <p className="mentrixa-form__footer">
      {message.verdict ? <span>{message.verdict} </span> : null}
      {message.nextAction ? <span className="opacity-90">{message.nextAction}</span> : null}
    </p>
  );
}

export function MentrixaForm({
  children,
  onSubmit,
  tone = "light",
  className,
}: {
  children: ReactNode;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  tone?: MentrixaFormTone;
  className?: string;
}) {
  return (
    <Form
      onSubmit={onSubmit}
      className={cn("mentrixa-form", TONE_CLASS[tone], className)}
    >
      {children}
    </Form>
  );
}

export function MentrixaFieldset({
  legend,
  description,
  children,
  actions,
  message,
  tone = "light",
  danger = false,
  className,
}: {
  legend: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  message?: MentrixaFormMessage | null;
  tone?: MentrixaFormTone;
  danger?: boolean;
  className?: string;
}) {
  return (
    <Fieldset
      className={cn(
        "mentrixa-fieldset",
        TONE_CLASS[tone],
        danger && "mentrixa-fieldset--danger",
        className,
      )}
    >
      <Fieldset.Legend className="mentrixa-fieldset__legend">{legend}</Fieldset.Legend>
      {description ? (
        <Description className="mentrixa-fieldset__description">{description}</Description>
      ) : null}
      <Fieldset.Group className="mentrixa-fieldset__group">{children}</Fieldset.Group>
      <FormMessageFooter message={message} />
      {actions ? <Fieldset.Actions className="mentrixa-fieldset__actions">{actions}</Fieldset.Actions> : null}
    </Fieldset>
  );
}

export function MentrixaFormField({
  label,
  name,
  type = "text",
  value,
  defaultValue,
  onChange,
  placeholder,
  hint,
  message,
  tone = "light",
  variant,
  isRequired,
  isDisabled,
  isReadOnly,
  multiline = false,
  rows = 4,
  maxLength,
  autoComplete,
  inputMode,
  pattern,
  validate,
  className,
  suppressFooter = false,
}: {
  label: string;
  name?: string;
  type?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  hint?: string;
  message?: MentrixaFormMessage | null;
  tone?: MentrixaFormTone;
  variant?: "primary" | "secondary";
  isRequired?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  pattern?: string;
  validate?: (value: string) => string | null;
  className?: string;
  suppressFooter?: boolean;
}) {
  const resolvedVariant =
    variant ?? (tone === "dark" ? "secondary" : "primary");
  const showFooter = !suppressFooter && (message?.verdict || message?.nextAction);

  return (
    <TextField
      name={name}
      type={multiline ? undefined : type}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      isRequired={isRequired}
      isDisabled={isDisabled}
      isReadOnly={isReadOnly}
      maxLength={maxLength}
      validate={validate}
      variant={resolvedVariant}
      fullWidth
      className={cn("mentrixa-form-field", TONE_CLASS[tone], className)}
    >
      <Label className="mentrixa-form-field__label">{label}</Label>
      {multiline ? (
        <TextArea
          placeholder={placeholder}
          rows={rows}
          variant={resolvedVariant}
          className="mentrixa-form-field__control"
        />
      ) : (
        <Input
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          pattern={pattern}
          variant={resolvedVariant}
          className="mentrixa-form-field__control"
        />
      )}
      {hint ? <Description className="mentrixa-form-field__hint">{hint}</Description> : null}
      <FieldError className="mentrixa-form-field__error" />
      {showFooter ? (
        <p className="mentrixa-form-field__footer">
          {message?.verdict ? <span>{message.verdict} </span> : null}
          {message?.nextAction ? <span className="opacity-90">{message.nextAction}</span> : null}
        </p>
      ) : null}
    </TextField>
  );
}
