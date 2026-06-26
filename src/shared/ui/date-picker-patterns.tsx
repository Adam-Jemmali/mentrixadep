"use client";

import type { DateValue } from "@internationalized/date";
import { cn } from "@/shared/core/utils";
import { Calendar, DateField, DatePicker } from "@/shared/ui/date-picker";
import { MentrixaBrandMark } from "@/shared/ui/mentrixa-ui-brand";

function MentrixaBookingCalendar({ "aria-label": ariaLabel }: { "aria-label": string }) {
  return (
    <Calendar aria-label={ariaLabel}>
      <Calendar.Header>
        <Calendar.YearPickerTrigger>
          <Calendar.YearPickerTriggerHeading />
          <Calendar.YearPickerTriggerIndicator />
        </Calendar.YearPickerTrigger>
        <Calendar.NavButton slot="previous" />
        <Calendar.NavButton slot="next" />
      </Calendar.Header>
      <Calendar.Grid>
        <Calendar.GridHeader>
          {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
        </Calendar.GridHeader>
        <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
      </Calendar.Grid>
      <Calendar.YearPickerGrid>
        <Calendar.YearPickerGridBody>
          {({ year }) => <Calendar.YearPickerCell year={year} />}
        </Calendar.YearPickerGridBody>
      </Calendar.YearPickerGrid>
    </Calendar>
  );
}

export function GuideBookingDatePicker({
  value,
  onChange,
  minValue,
  maxValue,
  isDateUnavailable,
  isDisabled,
  className,
  label = "Session date",
}: {
  value: DateValue | null;
  onChange: (value: DateValue | null) => void;
  minValue: DateValue;
  maxValue: DateValue;
  isDateUnavailable?: (date: DateValue) => boolean;
  isDisabled?: boolean;
  className?: string;
  label?: string;
}) {
  return (
    <DatePicker
      className={cn("w-full max-w-sm gap-2", className)}
      name="guideSessionDate"
      value={value}
      onChange={onChange}
      minValue={minValue}
      maxValue={maxValue}
      isDateUnavailable={isDateUnavailable}
      isDisabled={isDisabled}
    >
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-800">
        <MentrixaBrandMark kind="guide" size="xs" />
        {label}
      </span>
      <DateField.Group fullWidth variant="secondary" className="mentrixa-date-field-group">
        <DateField.Input>
          {(segment) => <DateField.Segment segment={segment} />}
        </DateField.Input>
        <DateField.Suffix>
          <DatePicker.Trigger aria-label="Open session calendar">
            <DatePicker.TriggerIndicator>
              <MentrixaBrandMark kind="mentrixa" size="xs" className="opacity-80" />
            </DatePicker.TriggerIndicator>
          </DatePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      <DatePicker.Popover>
        <MentrixaBookingCalendar aria-label="Choose a Guide session date" />
      </DatePicker.Popover>
    </DatePicker>
  );
}
