import prisma from '../../config/db.js';
import auditService from '../audit/audit.service.js';
import { clearHolidayCache } from '../../utils/expiry.js';

function holidayDateUtcNoon(value) {
  const iso = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12, 0, 0, 0));
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid holiday date');
  }
  const shifted = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  return new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate(), 12, 0, 0, 0)
  );
}

class HolidaysService {
  /**
   * Registers a new calendar public holiday
   */
  async createHoliday(data, actorId, req) {
    const { date, description } = data;
    const holidayDate = holidayDateUtcNoon(date);

    const holiday = await prisma.holiday.create({
      data: {
        date: holidayDate,
        description,
      },
    });
    clearHolidayCache();

    await auditService.log({
      action: 'HOLIDAY_CREATE',
      entityType: 'Holiday',
      entityId: holiday.id,
      actorId,
      newState: holiday,
      req,
    });

    return holiday;
  }

  /**
   * Retrieves all registered holidays
   */
  async getHolidays() {
    return prisma.holiday.findMany({
      orderBy: { date: 'asc' },
    });
  }

  /**
   * Deletes a calendar holiday
   */
  async deleteHoliday(id, actorId, req) {
    const holiday = await prisma.holiday.findUnique({
      where: { id },
    });

    if (!holiday) {
      throw new Error('Holiday record not found');
    }

    await prisma.holiday.delete({
      where: { id },
    });
    clearHolidayCache();

    await auditService.log({
      action: 'HOLIDAY_DELETE',
      entityType: 'Holiday',
      entityId: id,
      actorId,
      oldState: holiday,
      req,
    });

    return holiday;
  }
}

export default new HolidaysService();
