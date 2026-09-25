import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import classNames from 'classnames';

interface DateTimePickerProps {
  value: string; // ISO string or local datetime string
  onChange: (date: string) => void;
  label?: string;
  error?: boolean;
  popoverPosition?: 'top' | 'bottom';
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({ value, onChange, label, error, popoverPosition = 'bottom' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial date or use current
  const initialDate = value ? new Date(value) : new Date();
  const [currentMonth, setCurrentMonth] = useState(initialDate);
  const [selectedDate, setSelectedDate] = useState<Date | null>(value ? new Date(value) : null);

  useEffect(() => {
    if (value) {
      setSelectedDate(new Date(value));
    } else {
      setSelectedDate(null);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calendar logic
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  const firstDay = getFirstDayOfMonth(currentMonth.getFullYear(), currentMonth.getMonth());

  const totalSlots = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const days = Array.from({ length: totalSlots }, (_, i) => {
    const day = i - firstDay + 1;
    if (day <= 0) return null;
    if (day > daysInMonth) return null;
    return day;
  });

  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const handleDateSelect = (day: number) => {
    const newDate = new Date(
      currentMonth.getFullYear(), 
      currentMonth.getMonth(), 
      day, 
      selectedDate?.getHours() || 23, 
      selectedDate?.getMinutes() || 59
    );
    setSelectedDate(newDate);
    onChange(formatForInput(newDate));
  };

  const handleTimeChange = (type: 'hours' | 'minutes', val: string) => {
    const baseDate = selectedDate || new Date();
    const newDate = new Date(baseDate);
    if (type === 'hours') newDate.setHours(parseInt(val, 10));
    if (type === 'minutes') newDate.setMinutes(parseInt(val, 10));
    setSelectedDate(newDate);
    onChange(formatForInput(newDate));
  };

  const formatForInput = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const displayFormat = selectedDate 
    ? `${selectedDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${selectedDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
    : 'Select date and time...';

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={classNames(
          "w-full px-4 py-2.5 bg-white dark:bg-slate-800 border rounded-xl flex items-center justify-between cursor-pointer transition-all duration-200",
          error ? "border-red-300 focus:border-red-500 ring-1 ring-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.1)]" : "border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-500",
          isOpen && "ring-2 ring-brand-500/20 border-brand-500"
        )}
      >
        <span className={classNames("text-[15px] font-medium", selectedDate ? "text-slate-900 dark:text-white" : "text-slate-400")}>
          {displayFormat}
        </span>
        <Calendar size={18} className={classNames(selectedDate ? "text-brand-500" : "text-slate-400")} />
      </div>

      {isOpen && (
        <div className={classNames(
          "absolute z-[110] w-[300px] bg-white dark:bg-slate-800 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.25)] border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150",
          popoverPosition === 'top'
            ? "bottom-full mb-2 right-0 origin-bottom-right"
            : "top-full mt-2 left-0 sm:left-auto right-0 origin-top-right"
        )}>
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <button onClick={handlePrevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors">
                <ChevronLeft size={18} />
              </button>
              <div className="font-semibold text-slate-900 dark:text-white text-[15px]">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </div>
              <button onClick={handleNextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>
            
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-semibold text-slate-400 dark:text-slate-500 py-1">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((day, idx) => {
                if (day === null) return <div key={`empty-${idx}`} className="w-8 h-8"></div>;
                const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === currentMonth.getMonth() && selectedDate?.getFullYear() === currentMonth.getFullYear();
                const isToday = new Date().getDate() === day && new Date().getMonth() === currentMonth.getMonth() && new Date().getFullYear() === currentMonth.getFullYear();
                
                return (
                  <button
                    key={day}
                    onClick={() => handleDateSelect(day)}
                    className={classNames(
                      "w-full aspect-square rounded-full flex items-center justify-center text-sm transition-all duration-200 font-medium relative",
                      isSelected 
                        ? "bg-brand-600 text-white shadow-md shadow-brand-500/25" 
                        : isToday 
                          ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-500/20" 
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Clock size={16} className="text-brand-500 shrink-0" />
                <select 
                  value={selectedDate ? selectedDate.getHours().toString().padStart(2, '0') : '23'}
                  onChange={(e) => handleTimeChange('hours', e.target.value)}
                  className="w-[60px] px-1 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[14px] font-medium focus:ring-2 focus:ring-brand-500 outline-none text-slate-900 dark:text-white text-center cursor-pointer"
                >
                  {Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0')).map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <span className="text-slate-400 font-medium text-md">:</span>
                <select 
                  value={selectedDate ? selectedDate.getMinutes().toString().padStart(2, '0') : '59'}
                  onChange={(e) => handleTimeChange('minutes', e.target.value)}
                  className="w-[60px] px-1 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[14px] font-medium focus:ring-2 focus:ring-brand-500 outline-none text-slate-900 dark:text-white text-center cursor-pointer"
                >
                  {Array.from({length: 60}, (_, i) => i.toString().padStart(2, '0')).map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded text-sm font-medium transition-colors shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
