import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  formatCalendarDate,
  getCalendarMonthGrid,
  getCalendarParts,
  isDateOnOrAfter,
  isDateOnOrBefore,
  isSameCalendarDay,
  findHolidayForDate,
  isWeekendDate,
  parseCalendarDateString,
  shiftCalendarMonth,
} from '../../utils/ethiopianDate.js';

const ETHIOPIAN_MONTHS = {
  en: [
    'Meskerem',
    'Tikimt',
    'Hidar',
    'Tahsas',
    'Tir',
    'Yekatit',
    'Megabit',
    'Miazia',
    'Ginbot',
    'Sene',
    'Hamle',
    'Nehase',
    'Pagume',
  ],
  am: [
    'መስከረም',
    'ጥቅምት',
    'ኅዳር',
    'ታኅሣሥ',
    'ጥር',
    'የካቲት',
    'መጋቢት',
    'ሚያዝያ',
    'ግንቦት',
    'ሰኔ',
    'ሐምሌ',
    'ነሐሴ',
    'ጳጉሜን',
  ],
};

const GREGORIAN_MONTHS = {
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  am: [
    'ጃንዩወሪ',
    'ፌብሩወሪ',
    'ማርች',
    'ኤፕሪል',
    'ሜይ',
    'ጁን',
    'ጁላይ',
    'ኦገስት',
    'ሴፕቴምበር',
    'ኦክቶበር',
    'ኖቬምበር',
    'ዲሴምበር',
  ],
};

const WEEKDAYS = {
  en: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  am: ['እሑ', 'ሰኞ', 'ማክ', 'ረቡ', 'ሐሙ', 'ዓር', 'ቅዳ'],
};

const getMonthNames = (calendarMode, language) => {
  const locale = language === 'am' ? 'am' : 'en';
  return calendarMode === 'gregorian' ? GREGORIAN_MONTHS[locale] : ETHIOPIAN_MONTHS[locale];
};

const isDayOutOfRange = (date, minDate, maxDate) => {
  if (minDate && isDateOnOrBefore(date, minDate) && !isSameCalendarDay(date, minDate)) return true;
  if (maxDate && isDateOnOrAfter(date, maxDate) && !isSameCalendarDay(date, maxDate)) return true;
  return false;
};

const CalendarDatePicker = ({
  value,
  onChange,
  calendarMode,
  placeholder = 'DD/MM/YYYY',
  className = 'glass-input text-xs',
  minDate = null,
  maxDate = null,
  holidays = [],
  disabled = false,
  id,
}) => {
  const { t, i18n } = useTranslation();
  const language = i18n.language === 'am' ? 'am' : 'en';
  const wrapperRef = useRef(null);
  const panelRef = useRef(null);
  const openRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const [view, setView] = useState(() => {
    const parts = getCalendarParts(calendarMode, new Date());
    if (parts.year && parts.month) return parts;
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
    };
  });
  const [panelMode, setPanelMode] = useState('days');
  const [panelStyle, setPanelStyle] = useState({});

  const selectedDate = useMemo(
    () => parseCalendarDateString(calendarMode, value),
    [calendarMode, value]
  );
  const today = useMemo(() => new Date(), []);
  const monthNames = getMonthNames(calendarMode, language);
  const weekdays = WEEKDAYS[language];
  const grid = useMemo(
    () => (open ? getCalendarMonthGrid(calendarMode, view.year, view.month) : []),
    [open, calendarMode, view.year, view.month]
  );
  const yearOptions = useMemo(() => {
    const partsYear = getCalendarParts(calendarMode, today).year;
    const current = Number.isFinite(partsYear) && partsYear > 0 ? partsYear : Number(view.year) || 2018;
    const start = Math.trunc(current) - 20;
    const end = Math.trunc(current) + 8;
    const years = [];
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || end - start > 80) {
      return [Math.trunc(current)];
    }
    for (let year = start; year <= end; year += 1) years.push(year);
    const viewYear = Number(view.year);
    if (Number.isFinite(viewYear) && !years.includes(viewYear)) years.push(viewYear);
    return years.sort((a, b) => a - b);
  }, [calendarMode, today, view.year]);

  useEffect(() => {
    setDraft(value || '');
  }, [value]);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const anchor = selectedDate || today;
    const parts = getCalendarParts(calendarMode, anchor);
    if (parts.year && parts.month) {
      setView({ year: parts.year, month: parts.month, day: parts.day || 1 });
    }
    setPanelMode('days');
  }, [open, calendarMode, selectedDate, today]);

  const updatePosition = () => {
    const node = wrapperRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const width = Math.max(rect.width, 280);
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
    const spaceBelow = window.innerHeight - rect.bottom;
    const openAbove = spaceBelow < 340 && rect.top > spaceBelow;
    setPanelStyle({
      position: 'fixed',
      left: `${left}px`,
      width: `${width}px`,
      zIndex: 400,
      ...(openAbove
        ? { bottom: `${window.innerHeight - rect.top + 6}px` }
        : { top: `${rect.bottom + 6}px` }),
    });
  };

  useEffect(() => {
    if (!open) return undefined;
    updatePosition();
    const handleReposition = () => updatePosition();
    const handleKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const handlePointer = (event) => {
      if (
        wrapperRef.current?.contains(event.target) ||
        panelRef.current?.contains(event.target)
      ) {
        return;
      }
      setOpen(false);
    };
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handlePointer);
    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handlePointer);
    };
  }, [open]);

  const commitValue = (nextValue) => {
    setDraft(nextValue);
    onChange(nextValue);
  };

  const commitDate = (date) => {
    if (!date || isDayOutOfRange(date, minDate, maxDate)) return;
    commitValue(formatCalendarDate(calendarMode, date));
    setOpen(false);
  };

  const handleBlur = () => {
    window.setTimeout(() => {
      if (openRef.current) return;
      const trimmed = String(draft || '').trim();
      if (!trimmed) {
        if (value) onChange('');
        return;
      }
      const parsed = parseCalendarDateString(calendarMode, trimmed);
      if (parsed) {
        commitValue(formatCalendarDate(calendarMode, parsed));
      } else {
        setDraft(value || '');
      }
    }, 0);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          disabled={disabled}
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={handleBlur}
          className={`${className} pr-9`}
          autoComplete="off"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((current) => !current)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-app-muted hover:text-app-primary"
          aria-label={t('datePicker.open')}
        >
          <CalendarDays className="w-4 h-4" />
        </button>
      </div>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={panelStyle}
            className="rounded-xl border border-app-border bg-app-surface shadow-lg p-3"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <button
                type="button"
                className="btn-icon"
                onClick={() =>
                  setView((current) =>
                    shiftCalendarMonth(calendarMode, current, panelMode === 'years' ? -12 : -1)
                  )
                }
                aria-label={t('datePicker.prevMonth')}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1 min-w-0">
                <button
                  type="button"
                  className="text-sm font-semibold text-app-primary px-1.5 py-1 rounded-md hover:bg-app-surface-2"
                  onClick={() => setPanelMode((mode) => (mode === 'months' ? 'days' : 'months'))}
                >
                  {monthNames[view.month - 1]}
                </button>
                <button
                  type="button"
                  className="text-sm font-semibold text-app-primary px-1.5 py-1 rounded-md hover:bg-app-surface-2"
                  onClick={() => setPanelMode((mode) => (mode === 'years' ? 'days' : 'years'))}
                >
                  {view.year}
                </button>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() =>
                  setView((current) =>
                    shiftCalendarMonth(calendarMode, current, panelMode === 'years' ? 12 : 1)
                  )
                }
                aria-label={t('datePicker.nextMonth')}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {panelMode === 'months' && (
              <div className="grid grid-cols-3 gap-1 min-h-[180px]">
                {monthNames.map((name, index) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setView((current) => ({ ...current, month: index + 1, day: 1 }));
                      setPanelMode('days');
                    }}
                    className={`h-9 rounded-lg text-xs font-medium ${
                      view.month === index + 1
                        ? 'bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-text)]'
                        : 'text-app-secondary hover:bg-app-surface-2'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}

            {panelMode === 'years' && (
              <div className="grid grid-cols-4 gap-1 min-h-[180px] max-h-[220px] overflow-y-auto">
                {yearOptions.map((year) => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => {
                      setView((current) => ({ ...current, year, day: 1 }));
                      setPanelMode('days');
                    }}
                    className={`h-9 rounded-lg text-xs font-medium ${
                      view.year === year
                        ? 'bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-text)]'
                        : 'text-app-secondary hover:bg-app-surface-2'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}

            {panelMode === 'days' && (
              <>
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {weekdays.map((label) => (
                    <div
                      key={label}
                      className="text-[10px] font-semibold uppercase tracking-wide text-app-muted text-center py-1"
                    >
                      {label}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {grid.map((cell, index) => {
                    if (!cell?.date) {
                      return <div key={`empty-${index}`} className="h-8" />;
                    }
                    const disabledDay = isDayOutOfRange(cell.date, minDate, maxDate);
                    const selected = isSameCalendarDay(cell.date, selectedDate);
                    const isToday = isSameCalendarDay(cell.date, today);
                    const holiday = findHolidayForDate(cell.date, holidays);
                    const weekend = isWeekendDate(cell.date);
                    return (
                      <button
                        key={`${cell.day}-${index}`}
                        type="button"
                        disabled={disabledDay}
                        title={holiday?.description || (weekend ? t('datePicker.weekend') : undefined)}
                        onClick={() => commitDate(cell.date)}
                        className={`relative h-8 rounded-lg text-xs font-medium transition-colors ${
                          selected
                            ? 'bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-text)]'
                            : holiday
                              ? 'text-[var(--color-brand)] hover:bg-app-surface-2'
                              : weekend
                                ? 'text-app-muted hover:bg-app-surface-2'
                                : isToday
                                  ? 'border border-app-border text-app-primary'
                                  : 'text-app-secondary hover:bg-app-surface-2'
                        } ${disabledDay ? 'opacity-30 cursor-not-allowed hover:bg-transparent' : ''}`}
                      >
                        {cell.day}
                        {holiday && (
                          <span
                            className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
                            style={{ backgroundColor: 'var(--color-brand)' }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <div className="mt-3 pt-2 border-t border-app-border space-y-2">
              <div className="flex items-center gap-3 text-[10px] text-app-muted">
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--color-brand)' }} />
                  {t('datePicker.holiday')}
                </span>
                <span>{t('datePicker.weekend')}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="text-xs font-semibold text-app-secondary hover:text-app-primary"
                  onClick={() => commitDate(today)}
                >
                  {t('datePicker.today')}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-app-muted hover:text-app-primary"
                  onClick={() => {
                    commitValue('');
                    setOpen(false);
                  }}
                >
                  <X className="w-3 h-3" />
                  {t('datePicker.clear')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default CalendarDatePicker;
