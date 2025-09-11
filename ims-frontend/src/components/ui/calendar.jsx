// src/components/ui/calendar.jsx
"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, useDayPicker, useNavigation } from "react-day-picker"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/**
 * Custom Caption Component - Final Styled Version
 */
function CalendarCaption(props) {
  const { fromYear, toYear } = useDayPicker();
  const { goToMonth } = useNavigation();
  const isThai = props.locale?.code === 'th';

  const years = Array.from(
    { length: (toYear || new Date().getFullYear()) - (fromYear || 1900) + 1 },
    (_, i) => (fromYear || 1900) + i
  ).reverse();
  
  const months = Array.from({ length: 12 }, (_, i) => {
    return format(new Date(2000, i), "MMMM", { locale: props.locale });
  });

  const currentYear = props.displayMonth.getFullYear();
  const currentMonth = props.displayMonth.getMonth();

  return (
    <div className="flex justify-center items-center gap-2">
      <Select
        value={String(currentMonth)}
        onValueChange={(value) => {
          const newDate = new Date(props.displayMonth);
          newDate.setMonth(parseInt(value));
          goToMonth(newDate);
        }}
      >
        <SelectTrigger className="w-[120px] h-9 focus:ring-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {months.map((month, index) => (
            <SelectItem key={month} value={String(index)}>
              {month}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={String(currentYear)}
        onValueChange={(value) => {
          const newDate = new Date(props.displayMonth);
          newDate.setFullYear(parseInt(value));
          goToMonth(newDate);
        }}
      >
        <SelectTrigger className="w-[100px] h-9 focus:ring-0">
          <SelectValue>
            {isThai ? currentYear + 543 : currentYear}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={String(year)}>
              {isThai ? year + 543 : year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}) {
  return (
    (<DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-between pt-1 relative items-center mb-4 px-1",
        caption_label: "hidden",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        
        // --- START: ส่วนที่แก้ไข ---
        head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]", // ลดความกว้าง
        row: "flex w-full mt-2",
        cell: "h-8 w-8 text-center text-xs p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20", // ลดขนาด cell และ font
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 font-normal aria-selected:opacity-100" // ลดขนาดปุ่มวัน
        ),
        // --- END: ส่วนที่แก้ไข ---

        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside: "text-muted-foreground opacity-50",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Caption: props.captionLayout === 'dropdown-buttons' ? CalendarCaption : undefined,
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props} />)
  );
}
Calendar.displayName = "Calendar"

export { Calendar }