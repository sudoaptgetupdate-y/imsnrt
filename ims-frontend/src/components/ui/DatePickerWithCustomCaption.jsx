// src/components/ui/DatePickerWithCustomCaption.jsx

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { th } from "date-fns/locale"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const formatToBuddhistYear = (date, fmt) => {
  if (!date) return "";
  const buddhistYear = date.getFullYear() + 543;
  const formatString = fmt.replace('yyyy', buddhistYear);
  return format(date, formatString, { locale: th });
};

// This component remains mostly the same, but the key fix is inside the Year <SelectTrigger>
function CustomCaption({ displayMonth, onMonthChange, fromYear, toYear, locale }) {
  const isThai = locale?.code === 'th';

  const years = Array.from({ length: (toYear || 0) - (fromYear || 0) + 1 }, (_, i) => (fromYear || 0) + i).reverse();
  
  const months = Array.from({ length: 12 }, (_, i) => {
    return format(new Date(2000, i), "MMMM", { locale });
  });

  return (
    <div className="flex justify-center gap-2 mb-4">
      <Select
        value={String(displayMonth.getMonth())}
        onValueChange={(value) => {
          const newDate = new Date(displayMonth);
          newDate.setMonth(parseInt(value));
          onMonthChange(newDate);
        }}
      >
        <SelectTrigger className="w-[120px]">
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
        value={String(displayMonth.getFullYear())}
        onValueChange={(value) => {
          const newDate = new Date(displayMonth);
          newDate.setFullYear(parseInt(value));
          onMonthChange(newDate);
        }}
      >
        <SelectTrigger className="w-[100px]">
           {/* This is the corrected part. It now explicitly displays the correct year format. */}
          <span className="truncate">
            {isThai ? displayMonth.getFullYear() + 543 : displayMonth.getFullYear()}
          </span>
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

export function DatePickerWithCustomCaption({ value, onChange }) {
  const { i18n } = useTranslation();
  const isThai = i18n.language.startsWith('th');
  
  const [date, setDate] = React.useState(value ? new Date(value) : null);
  const [popoverOpen, setPopoverOpen] = React.useState(false);

  React.useEffect(() => {
    if (value) {
      setDate(new Date(value));
    } else {
      setDate(null);
    }
  }, [value]);

  const handleSelectDate = (selectedDate) => {
    if (selectedDate) {
      setDate(selectedDate);
      if (onChange) {
        onChange(selectedDate);
      }
      setPopoverOpen(false);
    }
  }

  const fromYear = new Date().getFullYear() - 10;
  const toYear = new Date().getFullYear();

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? (
            isThai 
              ? formatToBuddhistYear(date, 'dd MMMM yyyy') 
              : format(date, "PPP")
          ) : (
            <span>Pick a date</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <DayPicker
          mode="single"
          selected={date}
          onSelect={handleSelectDate}
          locale={isThai ? th : undefined}
          fromYear={fromYear}
          toYear={toYear}
          captionLayout="dropdown"
          components={{
            Caption: (props) => (
              <CustomCaption {...props} fromYear={fromYear} toYear={toYear} locale={isThai ? th : undefined} />
            )
          }}
          classNames={{
            caption_label: "hidden",
            nav_button: "h-6 w-6"
          }}
        />
      </PopoverContent>
    </Popover>
  );
}