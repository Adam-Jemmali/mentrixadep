"use client";

import {
  Description,
  FieldError,
  Label,
  NumberField,
} from "@/shared/ui/hero-number-field";
import { cn } from "@/shared/core/utils";
import {
  adminNumberFieldMessage,
  type MentrixaAdminNumberFieldId,
  type MentrixaNumberFieldMessage,
} from "@/shared/ui/number-field-messages-pure";

export type MentrixaNumberFieldTone = "light" | "dark";

const TONE_CLASS: Record<MentrixaNumberFieldTone, string> = {
  light: "mentrixa-number-field--light",
  dark: "mentrixa-number-field--dark",
};

export function MentrixaNumberField({
  label,
  name,
  value,
  defaultValue,
  onChange,
  minValue,
  maxValue,
  step = 1,
  hint,
  suffix,
  message,
  tone = "light",
  variant,
  layout = "default",
  hideLabel = false,
  isDisabled,
  isRequired,
  formatOptions,
  validate,
  className,
  suppressFooter = false,
}: {
  label: string;
  name?: string;
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  minValue?: number;
  maxValue?: number;
  step?: number;
  hint?: string;
  suffix?: string;
  message?: MentrixaNumberFieldMessage | null;
  tone?: MentrixaNumberFieldTone;
  variant?: "primary" | "secondary";
  layout?: "default" | "compact";
  hideLabel?: boolean;
  isDisabled?: boolean;
  isRequired?: boolean;
  formatOptions?: Intl.NumberFormatOptions;
  validate?: (value: number) => string | null;
  className?: string;
  suppressFooter?: boolean;
}) {
  const resolvedVariant =
    variant ?? (tone === "dark" ? "secondary" : "primary");
  const showFooter = !suppressFooter && (message?.verdict || message?.nextAction);
  const resolvedHint =
    hint ?? (suffix && layout !== "compact" ? `Measured in ${suffix.replace(/^\s*/, "")}` : undefined);

  const field = (
    <NumberField
      name={name}
      value={value}
      defaultValue={defaultValue}
      onChange={(next) => {
        if (next !== undefined) onChange?.(next);
      }}
      minValue={minValue}
      maxValue={maxValue}
      step={step}
      isDisabled={isDisabled}
      isRequired={isRequired}
      formatOptions={formatOptions}
      validate={validate}
      variant={resolvedVariant}
      aria-label={hideLabel ? label : undefined}
      className={cn(
        "mentrixa-number-field",
        TONE_CLASS[tone],
        layout === "compact" && "mentrixa-number-field--compact",
        className,
      )}
    >
      {!hideLabel ? (
        <Label className="mentrixa-number-field__label">{label}</Label>
      ) : null}
      <NumberField.Group className="mentrixa-number-field__group">
        <NumberField.DecrementButton className="mentrixa-number-field__step" />
        <NumberField.Input className="mentrixa-number-field__input" />
        <NumberField.IncrementButton className="mentrixa-number-field__step" />
      </NumberField.Group>
      {resolvedHint ? (
        <Description className="mentrixa-number-field__hint">{resolvedHint}</Description>
      ) : null}
      <FieldError className="mentrixa-number-field__error" />
      {showFooter ? (
        <p className="mentrixa-number-field__footer">
          {message?.verdict ? <span>{message.verdict} </span> : null}
          {message?.nextAction ? <span className="opacity-90">{message.nextAction}</span> : null}
        </p>
      ) : null}
    </NumberField>
  );

  if (layout === "compact" && suffix) {
    return (
      <div className="mentrixa-number-field__inline">
        {field}
        <span className="mentrixa-number-field__suffix">{suffix}</span>
      </div>
    );
  }

  return field;
}

/** Inline admin row control: compact, label owned by SettingRow. */
export function MentrixaAdminNumberField({
  label,
  fieldId,
  value,
  onChange,
  minValue,
  maxValue,
  step = 1,
  suffix,
  validate,
  isDisabled,
  className,
}: {
  label: string;
  fieldId: MentrixaAdminNumberFieldId;
  value: number;
  onChange: (value: number) => void;
  minValue?: number;
  maxValue?: number;
  step?: number;
  suffix?: string;
  validate?: (value: number) => string | null;
  isDisabled?: boolean;
  className?: string;
}) {
  return (
    <MentrixaNumberField
      label={label}
      value={value}
      onChange={onChange}
      minValue={minValue}
      maxValue={maxValue}
      step={step}
      suffix={suffix}
      validate={validate}
      isDisabled={isDisabled}
      tone="light"
      layout="compact"
      hideLabel
      suppressFooter
      message={adminNumberFieldMessage(fieldId)}
      className={className}
    />
  );
}
