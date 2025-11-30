"use client";

import * as React from "react";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "bg-white group/calendar shadow-sm rounded-xl",
        "p-2 sm:p-3 md:p-4",
        "[--cell-size:2rem] sm:[--cell-size:2.5rem] md:[--cell-size:2.75rem]",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "long" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-3 sm:gap-4 md:gap-6 md:flex-row",
          defaultClassNames.months
        ),
        month: cn(
          "flex w-full flex-col gap-3 sm:gap-4 md:gap-5",
          defaultClassNames.month
        ),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 select-none p-0 hover:bg-linear-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-600 transition-all duration-200 rounded-lg aria-disabled:opacity-50",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 select-none p-0 hover:bg-linear-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-600 transition-all duration-200 rounded-lg aria-disabled:opacity-50",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-8 sm:h-9 md:h-10 w-full items-center justify-center px-7 sm:px-8 md:px-10",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "flex h-8 sm:h-9 md:h-10 w-full items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base font-bold",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "relative rounded-lg border-2 border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all duration-200",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "bg-white absolute inset-0 opacity-0 cursor-pointer",
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          "select-none font-bold text-gray-900",
          captionLayout === "label"
            ? "text-sm sm:text-base"
            : "flex h-7 sm:h-8 md:h-9 items-center gap-1 sm:gap-1.5 rounded-lg pl-2 sm:pl-3 pr-1 sm:pr-2 text-sm sm:text-base hover:bg-linear-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 [&>svg]:size-3.5 sm:[&>svg]:size-4 [&>svg]:text-gray-600",
          defaultClassNames.caption_label
        ),
        table: "w-full border-collapse mt-1",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "text-gray-600 flex-1 select-none rounded-md text-[0.65rem] sm:text-xs font-bold uppercase tracking-wide sm:tracking-wider mb-1 sm:mb-2",
          defaultClassNames.weekday
        ),
        week: cn(
          "mt-0.5 sm:mt-1 flex w-full gap-0.5 sm:gap-1",
          defaultClassNames.week
        ),
        week_number_header: cn(
          "w-[--cell-size] select-none",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "text-gray-500 select-none text-xs sm:text-sm font-semibold",
          defaultClassNames.week_number
        ),
        day: cn(
          "group/day relative aspect-square h-full w-full select-none p-0 text-center [&:first-child[data-selected=true]_button]:rounded-lg [&:last-child[data-selected=true]_button]:rounded-lg",
          defaultClassNames.day
        ),
        range_start: cn(
          "bg-linear-to-r from-blue-100 to-indigo-100 rounded-lg",
          defaultClassNames.range_start
        ),
        range_middle: cn(
          "bg-blue-50 rounded-none",
          defaultClassNames.range_middle
        ),
        range_end: cn(
          "bg-linear-to-r from-indigo-100 to-blue-100 rounded-lg",
          defaultClassNames.range_end
        ),
        today: cn(
          "bg-linear-to-br from-amber-50 to-orange-50 text-gray-900 font-semibold rounded-lg ring-2 ring-amber-200 data-[selected=true]:ring-0",
          defaultClassNames.today
        ),
        outside: cn(
          "text-gray-400 opacity-50 aria-selected:text-gray-400",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-gray-400 opacity-40 cursor-not-allowed",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          );
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-5", className)} {...props} />
            );
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-5", className)}
                {...props}
              />
            );
          }

          return (
            <ChevronDownIcon className={cn("size-5", className)} {...props} />
          );
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-[--cell-size] items-center justify-center text-center">
                {children}
              </div>
            </td>
          );
        },
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames();

  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        // Base styles
        "flex aspect-square h-auto w-full min-w-[--cell-size] flex-col gap-1 font-semibold leading-none rounded-lg transition-all duration-200",
        // Hover effect
        "hover:bg-linear-to-br hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 hover:scale-105 hover:shadow-sm",
        // Selected single date
        "data-[selected-single=true]:bg-linear-to-br data-[selected-single=true]:from-blue-500 data-[selected-single=true]:to-indigo-600 data-[selected-single=true]:text-white data-[selected-single=true]:shadow-lg data-[selected-single=true]:shadow-blue-200 data-[selected-single=true]:scale-105",
        // Range middle
        "data-[range-middle=true]:bg-linear-to-r data-[range-middle=true]:from-blue-100 data-[range-middle=true]:to-indigo-100 data-[range-middle=true]:text-blue-900",
        // Range start
        "data-[range-start=true]:bg-linear-to-br data-[range-start=true]:from-blue-500 data-[range-start=true]:to-indigo-600 data-[range-start=true]:text-white data-[range-start=true]:shadow-lg data-[range-start=true]:shadow-blue-200",
        // Range end
        "data-[range-end=true]:bg-linear-to-br data-[range-end=true]:from-indigo-500 data-[range-end=true]:to-blue-600 data-[range-end=true]:text-white data-[range-end=true]:shadow-lg data-[range-end=true]:shadow-indigo-200",
        // Focused state
        "group-data-[focused=true]/day:ring-2 group-data-[focused=true]/day:ring-blue-400 group-data-[focused=true]/day:ring-offset-2",
        // Border radius adjustments
        "data-[range-end=true]:rounded-lg data-[range-middle=true]:rounded-md data-[range-start=true]:rounded-lg",
        "[&>span]:text-xs [&>span]:opacity-80",
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
