import { motion } from 'motion/react';

interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface CalendarGridProps {
  currentDate: Date;
  selectedRange: DateRange;
  onDateClick: (date: Date) => void;
  hideLegend?: boolean;
  isDark: boolean;
}

export function CalendarGrid({ currentDate, selectedRange, onDateClick, hideLegend = false, isDark }: CalendarGridProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get first day of month and last day of month
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
  const firstDayWeekday = firstDayOfMonth.getDay();
  
  // Get days in month
  const daysInMonth = lastDayOfMonth.getDate();
  
  // Get days from previous month to show
  const previousMonth = new Date(year, month, 0);
  const daysInPreviousMonth = previousMonth.getDate();
  
  const weekDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  
  // Build calendar days array
  const calendarDays: { date: Date; isCurrentMonth: boolean }[] = [];
  
  // Add previous month days
  const prevMonthDaysToShow = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1;
  for (let i = prevMonthDaysToShow; i > 0; i--) {
    calendarDays.push({
      date: new Date(year, month - 1, daysInPreviousMonth - i + 1),
      isCurrentMonth: false,
    });
  }
  
  // Add current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
    });
  }
  
  // Add next month days to complete the grid
  const remainingDays = 42 - calendarDays.length; // 6 rows * 7 days
  for (let i = 1; i <= remainingDays; i++) {
    calendarDays.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
    });
  }

  const isDateInRange = (date: Date) => {
    if (!selectedRange.start) return false;
    if (!selectedRange.end) return isSameDay(date, selectedRange.start);
    
    return date >= selectedRange.start && date <= selectedRange.end;
  };

  const isStartDate = (date: Date) => {
    return selectedRange.start && isSameDay(date, selectedRange.start);
  };

  const isEndDate = (date: Date) => {
    return selectedRange.end && isSameDay(date, selectedRange.end);
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return isSameDay(date, today);
  };

  return (
    <div className="calendar-grid">
      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-1 mb-3">
        {weekDays.map((day) => (
          <div
            key={day}
            className={`text-center text-xs md:text-sm font-medium py-2 ${
              day === 'SAT' || day === 'SUN' ? 'text-blue-500' : 'text-slate-600'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          const inRange = isDateInRange(day.date);
          const isStart = isStartDate(day.date);
          const isEnd = isEndDate(day.date);
          const weekend = isWeekend(day.date);
          const today = isToday(day.date);

          return (
            <motion.button
              key={index}
              whileHover={{ scale: day.isCurrentMonth ? 1.1 : 1 }}
              whileTap={{ scale: day.isCurrentMonth ? 0.95 : 1 }}
              onClick={() => day.isCurrentMonth && onDateClick(day.date)}
              className={`
                relative aspect-square flex items-center justify-center text-sm md:text-base
                rounded-lg transition-all
                ${!day.isCurrentMonth ? 'text-slate-300 cursor-default' : 'cursor-pointer'}
                ${day.isCurrentMonth && weekend ? 'text-blue-500 font-medium' : ''}
                ${day.isCurrentMonth && !weekend ? 'text-slate-700' : ''}
                ${inRange && day.isCurrentMonth ? 'bg-blue-100' : ''}
                ${(isStart || isEnd) && day.isCurrentMonth ? 'bg-blue-500 text-white font-bold shadow-lg' : ''}
                ${today && !inRange && day.isCurrentMonth ? 'ring-2 ring-blue-400 ring-offset-1' : ''}
                ${day.isCurrentMonth && !inRange ? 'hover:bg-slate-100' : ''}
              `}
              disabled={!day.isCurrentMonth}
            >
              {day.date.getDate()}
              
              {/* Today indicator */}
              {today && !inRange && day.isCurrentMonth && (
                <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Legend */}
      {!hideLegend && (
        <div className="mt-6 flex flex-wrap gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-500 rounded-md" />
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-100 rounded-md border border-blue-200" />
            <span>In Range</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md border-2 border-blue-400" />
            <span>Today</span>
          </div>
        </div>
      )}
    </div>
  );
}
