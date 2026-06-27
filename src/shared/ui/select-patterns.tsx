"use client";

import type { Key, ReactNode } from "react";
import { cn } from "@/shared/core/utils";
import { APP_TIMEZONES } from "@/shared/core/timezones";
import { Select, ListBox, Description } from "@/shared/ui/hero-select";
import { MentrixaBrandMark, type MentrixaBrandKind } from "@/shared/ui/mentrixa-ui-brand";

export type MentrixaSelectOption = {
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

export type MentrixaSelectTone = "light" | "dark" | "video" | "filter";

const TONE_CLASS: Record<MentrixaSelectTone, string> = {
  light: "mentrixa-select--light",
  dark: "mentrixa-select--dark",
  video: "mentrixa-select--video",
  filter: "mentrixa-select--filter",
};

function formatTimezoneLabel(tz: string): string {
  return tz.replace(/_/g, " ");
}

export function MentrixaSelect({
  options,
  value,
  defaultValue,
  onChange,
  label,
  brandKind = "mentrixa",
  placeholder = "Select one",
  description,
  variant = "secondary",
  tone = "light",
  fullWidth = true,
  disabled,
  isRequired,
  noneOption,
  className,
  triggerClassName,
  name,
  "aria-label": ariaLabel,
  renderValue,
  renderOption,
}: {
  options: MentrixaSelectOption[];
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (value: string | null) => void;
  label?: ReactNode;
  brandKind?: MentrixaBrandKind;
  placeholder?: string;
  description?: string;
  variant?: "primary" | "secondary";
  tone?: MentrixaSelectTone;
  fullWidth?: boolean;
  disabled?: boolean;
  isRequired?: boolean;
  noneOption?: { id: string; label: string };
  className?: string;
  triggerClassName?: string;
  name?: string;
  "aria-label"?: string;
  renderValue?: (option: MentrixaSelectOption | null) => ReactNode;
  renderOption?: (option: MentrixaSelectOption) => ReactNode;
}) {
  const controlled = value !== undefined;
  const resolvedValue = controlled
    ? noneOption
      ? (value ?? noneOption.id)
      : (value ?? null)
    : undefined;
  const resolvedDefault = !controlled
    ? noneOption
      ? (defaultValue ?? noneOption.id)
      : (defaultValue ?? null)
    : undefined;

  const optionById = new Map(options.map((o) => [o.id, o]));

  const handleChange = (key: Key | Key[] | null) => {
    if (!onChange) return;
    const id = key == null ? null : String(Array.isArray(key) ? key[0] : key);
    onChange(noneOption && id === noneOption.id ? null : id);
  };

  return (
    <Select
      className={cn(TONE_CLASS[tone], className)}
      fullWidth={fullWidth}
      variant={variant}
      placeholder={placeholder}
      value={resolvedValue}
      defaultValue={resolvedDefault}
      onChange={handleChange}
      isDisabled={disabled}
      isRequired={isRequired}
      name={name}
      aria-label={ariaLabel}
    >
      {label ? (
        <span className="mentrixa-select__label">
          <MentrixaBrandMark kind={brandKind} size="xs" className="opacity-80" />
          <span>{label}</span>
        </span>
      ) : null}
      <Select.Trigger className={triggerClassName}>
        <Select.Value>
          {renderValue
            ? ({ isPlaceholder, state }) => {
                if (isPlaceholder || state.selectedItems.length === 0) {
                  return placeholder;
                }
                const id = String(state.selectedItems[0]?.key ?? "");
                if (noneOption && id === noneOption.id) {
                  return renderValue(null);
                }
                return renderValue(optionById.get(id) ?? null);
              }
            : undefined}
        </Select.Value>
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="max-h-64 overflow-y-auto">
        <ListBox>
          {noneOption ? (
            <ListBox.Item id={noneOption.id} textValue={noneOption.label}>
              {renderOption
                ? renderOption({ id: noneOption.id, label: noneOption.label })
                : noneOption.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ) : null}
          {options.map((opt) => (
            <ListBox.Item
              key={opt.id}
              id={opt.id}
              textValue={opt.label}
              isDisabled={opt.disabled}
            >
              {renderOption ? (
                renderOption(opt)
              ) : opt.description ? (
                <div className="flex flex-col gap-0.5">
                  <span>{opt.label}</span>
                  <span className="text-[11px] text-slate-500">{opt.description}</span>
                </div>
              ) : (
                opt.label
              )}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
      {description ? <Description className="mentrixa-select__description">{description}</Description> : null}
    </Select>
  );
}

export function MentrixaTimezoneSelect({
  value,
  onChange,
  label = "Timezone",
  description,
  tone = "light",
  brandKind = "mentrixer",
  className,
  disabled,
}: {
  value: string;
  onChange: (tz: string) => void;
  label?: string;
  description?: string;
  tone?: MentrixaSelectTone;
  brandKind?: MentrixaBrandKind;
  className?: string;
  disabled?: boolean;
}) {
  const options = APP_TIMEZONES.map((tz) => ({
    id: tz,
    label: formatTimezoneLabel(tz),
  }));

  return (
    <MentrixaSelect
      options={options}
      value={value}
      onChange={(id) => id && onChange(id)}
      label={label}
      brandKind={brandKind}
      description={description}
      tone={tone}
      className={className}
      disabled={disabled}
      placeholder="Choose timezone"
    />
  );
}

export function MentrixaFilterSelect({
  value,
  onChange,
  options,
  "aria-label": ariaLabel,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: MentrixaSelectOption[];
  "aria-label": string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <MentrixaSelect
      options={options}
      value={value}
      onChange={(id) => id && onChange(id)}
      tone="filter"
      variant="secondary"
      fullWidth={false}
      className={cn("w-[9.5rem]", className)}
      triggerClassName="min-w-[9.5rem]"
      aria-label={ariaLabel}
      placeholder={placeholder ?? "Filter"}
      brandKind="mentrixa"
    />
  );
}

export function durationSelectOptions(minutes: readonly number[]): MentrixaSelectOption[] {
  return minutes.map((d) => ({ id: String(d), label: `${d} minutes` }));
}

export function bufferSelectOptions(minutes: readonly number[]): MentrixaSelectOption[] {
  return minutes.map((b) => ({
    id: String(b),
    label: b === 0 ? "No buffer" : `${b} minutes`,
  }));
}
