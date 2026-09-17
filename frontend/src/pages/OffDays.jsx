import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCalendar } from '../context/CalendarContext.jsx';
import { Plus, Trash2, ShieldAlert, CheckCircle } from 'lucide-react';
import { PageHeader, PageSkeleton } from '../components/ui/Page.jsx';
import CalendarDatePicker from '../components/ui/CalendarDatePicker.jsx';
import { createHoliday, deleteHoliday, getHolidays } from '../services/campus.service.js';
import { formatCalendarDate, parseCalendarDateString } from '../utils/ethiopianDate.js';

const OffDays = () => {
  const { t } = useTranslation();
  const { calendarMode } = useCalendar();
  const [loading, setLoading] = useState(true);
  const [holidays, setHolidays] = useState([]);
  const [dateValue, setDateValue] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await getHolidays();
      setHolidays(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load off days');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const parsed = parseCalendarDateString(calendarMode, dateValue);
    if (!parsed || !description.trim()) {
      setError(t('offDays.invalid'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createHoliday({
        date: parsed.toISOString(),
        description: description.trim(),
      });
      setDateValue('');
      setDescription('');
      setSuccess(t('offDays.created'));
      await load();
    } catch (err) {
      setError(err.response?.data?.message || t('offDays.createFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('offDays.deleteConfirm'))) return;
    try {
      await deleteHoliday(id);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || t('offDays.deleteFailed'));
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="page-shell space-y-5">
      <div className="surface-card">
        <PageHeader title={t('offDays.title')} subtitle={t('offDays.subtitle')} />
      </div>

      {error && (
        <div className="alert alert-error">
          <ShieldAlert className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          <CheckCircle className="w-4 h-4" />
          <span>{success}</span>
        </div>
      )}

      <div className="surface-card">
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="form-group">
            <label className="input-label">{t('offDays.date')}</label>
            <CalendarDatePicker
              calendarMode={calendarMode}
              value={dateValue}
              onChange={setDateValue}
              holidays={holidays}
            />
          </div>
          <div className="form-group">
            <label className="input-label">{t('offDays.reason')}</label>
            <input
              className="glass-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('offDays.reasonPlaceholder')}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Plus className="w-4 h-4" />
            {t('offDays.add')}
          </button>
        </form>
      </div>

      <div className="surface-card">
        {holidays.length === 0 ? (
          <p className="text-sm text-app-muted">{t('offDays.empty')}</p>
        ) : (
          <ul className="space-y-2">
            {holidays.map((holiday) => (
              <li
                key={holiday.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-app-border px-4 py-3"
              >
                <div>
                  <div className="text-sm font-semibold text-app-primary">
                    {formatCalendarDate(calendarMode, holiday.date)}
                  </div>
                  <div className="text-xs text-app-muted">{holiday.description}</div>
                </div>
                <button type="button" className="btn-icon" onClick={() => handleDelete(holiday.id)}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default OffDays;
