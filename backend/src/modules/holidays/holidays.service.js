import prisma from '../../config/db.js';
import auditService from '../audit/audit.service.js';

class HolidaysService {
  /**
   * Registers a new calendar public holiday
   */
  async createHoliday(data, actorId, req) {
    const { date, description } = data;
    
    // Ensure date is stored as clean ISO date with zeroed hours
    const holidayDate = new Date(date);
    holidayDate.setUTCHours(0, 0, 0, 0);

    const holiday = await prisma.holiday.create({
      data: {
        date: holidayDate,
        description,
      },
    });

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
