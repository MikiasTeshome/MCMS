import React, { createContext, useContext, useEffect, useState } from 'react';

const CalendarContext = createContext(null);
const STORAGE_KEY = 'mcms_calendar_mode';

const normalizeCalendarMode = (value) => (value === 'gregorian' ? 'gregorian' : 'ethiopian');

export const CalendarProvider = ({ children }) => {
  const [calendarMode, setCalendarMode] = useState(() => {
    if (typeof window === 'undefined') return 'ethiopian';
    return normalizeCalendarMode(localStorage.getItem(STORAGE_KEY));
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, calendarMode);
  }, [calendarMode]);

  return (
    <CalendarContext.Provider value={{ calendarMode, setCalendarMode, normalizeCalendarMode }}>
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = () => {
  const ctx = useContext(CalendarContext);
  if (!ctx) throw new Error('useCalendar must be used within CalendarProvider');
  return ctx;
};
