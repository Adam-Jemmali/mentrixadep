"use client";

import { useState } from "react";
import { RadioGroup, Radio, Description } from "@/shared/ui/hero-radio-group";
import { cn } from "@/shared/core/utils";
import {
  formatStudentMomentumSubscriptionAnnualPrice,
  formatStudentMomentumSubscriptionMonthlyPrice,
} from "@/features/booking/booking-pricing";
import {
  billingIntervalRadioAriaLabel,
  billingIntervalRadioMessage,
  contactCategoryRadioMessage,
  type MentrixaBillingInterval,
  type MentrixaContactCategory,
  type MentrixaRadioMessage,
} from "@/shared/ui/radio-group-messages-pure";

export type MentrixaRadioTone = "light" | "dark";

export type MentrixaRadioOption = {
  value: string;
  label: string;
  description?: string;
};

const TONE_CLASS: Record<MentrixaRadioTone, string> = {
  light: "mentrixa-radio-group--light",
  dark: "mentrixa-radio-group--dark",
};

function RadioGroupFooter({ verdict, nextAction }: MentrixaRadioMessage) {
  return (
    <p className="mentrixa-radio-group__footer">
      <span>{verdict} </span>
      <span className="opacity-90">{nextAction}</span>
    </p>
  );
}

export function MentrixaRadioGroup({
  label,
  options,
  value,
  defaultValue,
  onChange,
  name,
  tone = "light",
  layout = "stack",
  variant = "primary",
  isRequired,
  isDisabled,
  className,
  message,
  ariaLabel,
}: {
  label?: string;
  options: MentrixaRadioOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  tone?: MentrixaRadioTone;
  layout?: "stack" | "segmented";
  variant?: "primary" | "secondary";
  isRequired?: boolean;
  isDisabled?: boolean;
  className?: string;
  message?: MentrixaRadioMessage | null;
  ariaLabel?: string;
}) {
  const orientation = layout === "segmented" ? "horizontal" : "vertical";

  return (
    <div className={cn("mentrixa-radio-group", TONE_CLASS[tone], className)}>
      {label ? <p className="mentrixa-radio-group__label">{label}</p> : null}
      <RadioGroup
        name={name}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        orientation={orientation}
        variant={variant}
        isRequired={isRequired}
        isDisabled={isDisabled}
        aria-label={ariaLabel ?? label}
        className={cn(
          "mentrixa-radio-group__items",
          layout === "segmented" ? "mentrixa-radio-group__items--segmented" : "mentrixa-radio-group__items--stack",
        )}
      >
        {options.map((option) => (
          <Radio key={option.value} value={option.value} className="mentrixa-radio-group__option">
            <Radio.Content className="mentrixa-radio-group__option-content">
              <Radio.Control className="mentrixa-radio-group__control">
                <Radio.Indicator className="mentrixa-radio-group__indicator" />
              </Radio.Control>
              <span className="mentrixa-radio-group__option-label">{option.label}</span>
              {layout === "segmented" && option.description ? (
                <Description className="mentrixa-radio-group__option-description">
                  {option.description}
                </Description>
              ) : null}
            </Radio.Content>
            {layout !== "segmented" && option.description ? (
              <Description className="mentrixa-radio-group__option-description">
                {option.description}
              </Description>
            ) : null}
          </Radio>
        ))}
      </RadioGroup>
      {message ? <RadioGroupFooter {...message} /> : null}
    </div>
  );
}

export function MentrixaBillingIntervalRadioGroup({
  value,
  onChange,
  tone = "light",
  className,
}: {
  value: MentrixaBillingInterval;
  onChange: (value: MentrixaBillingInterval) => void;
  tone?: MentrixaRadioTone;
  className?: string;
}) {
  return (
    <MentrixaRadioGroup
      label="Choose how you will be billed"
      ariaLabel={billingIntervalRadioAriaLabel()}
      value={value}
      onChange={(next) => onChange(next as MentrixaBillingInterval)}
      tone={tone}
      layout="segmented"
      variant="secondary"
      className={cn("mentrixa-radio-group--billing-interval", className)}
      message={billingIntervalRadioMessage(value)}
      options={[
        {
          value: "annual",
          label: "Annual",
          description: formatStudentMomentumSubscriptionAnnualPrice(),
        },
        {
          value: "monthly",
          label: "Monthly",
          description: formatStudentMomentumSubscriptionMonthlyPrice(),
        },
      ]}
    />
  );
}

export function MentrixaContactCategoryRadioGroup({
  defaultValue = "feedback",
  tone = "light",
  className,
}: {
  defaultValue?: MentrixaContactCategory;
  tone?: MentrixaRadioTone;
  className?: string;
}) {
  const [value, setValue] = useState<MentrixaContactCategory>(defaultValue);

  return (
    <MentrixaRadioGroup
      label="What's this about?"
      name="category"
      isRequired
      value={value}
      onChange={(next) => setValue(next as MentrixaContactCategory)}
      tone={tone}
      layout="stack"
      className={className}
      message={contactCategoryRadioMessage(value)}
      options={[
        { value: "feedback", label: "Product feedback and ideas" },
        { value: "bug", label: "Something broke" },
        { value: "billing", label: "Billing and payments" },
        { value: "partnership", label: "Partnership or press" },
        { value: "other", label: "Other" },
      ]}
    />
  );
}
