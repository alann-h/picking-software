import React, { useState, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import { Calendar as CalendarIcon } from 'lucide-react';
import 'react-day-picker/dist/style.css';
import PortalDropdown from '../components/PortalDropdown';

interface DatePickerPopoverProps {
  date?: string | null;
  onSelect: (formattedDate: string) => void;
  label?: string;
}

const DatePickerPopover: React.FC<DatePickerPopoverProps> = ({ date, onSelect, label = "Pick a date" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  const selectedDate = useMemo(() => (date ? new Date(date) : undefined), [date]);

  const handleSelect = (selected: Date | undefined) => {
    if (selected) {
      onSelect(format(selected, 'yyyy-MM-dd'));
      setIsOpen(false);
    }
  };

  const modifiers = {
    weekend: (date: Date) => {
      const day = date.getDay();
      return day === 0 || day === 6;
    }
  };

  return (
    <div className="relative inline-block" ref={triggerRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-2 bg-white border border-gray-300 rounded-md px-3 py-1.5 text-gray-800 hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
      >
        <CalendarIcon className="w-4 h-4 text-gray-400" />
        {selectedDate ? format(selectedDate, "PPP") : label}
      </button>

      {/* Use your Portal implementation */}
      <PortalDropdown
        isOpen={isOpen}
        triggerRef={triggerRef}
        setIsDropdownOpen={setIsOpen}
        className="z-[100] mt-2 bg-white border border-gray-200 shadow-2xl rounded-xl p-3 fade-in duration-150 !w-auto"      >
        <DayPicker
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          modifiers={modifiers}
          modifiersClassNames={{
            weekend: "text-gray-400 opacity-60"
          }}
          classNames={{
            day_selected: "bg-blue-600 text-white hover:bg-blue-700 rounded-full opacity-100 !outline-none !ring-0 !border-transparent",
            day_today: "text-gray-900 font-bold underline decoration-blue-500 underline-offset-4",
            day: "h-9 w-9 text-center p-0 font-normal hover:bg-gray-100 rounded-md transition-colors outline-none focus:outline-none focus-visible:outline-none",
            nav_button: "border border-gray-200 rounded-md p-1 hover:bg-gray-50",
            caption: "flex justify-center pt-1 relative items-center mb-2",
            caption_label: "text-sm font-medium",
            button: "outline-none focus:outline-none",
          }}
        />
      </PortalDropdown>
    </div>
  );
};

export default DatePickerPopover;