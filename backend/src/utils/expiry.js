import prisma from '../config/db.js';

/**
 * Calculate a future Date object that is `workingDays` business days after `startDate`.
 * It excludes Saturday, Sunday, and any dates present in the `Holiday` table.
 *
 * @param {Date} startDate - The starting point (usually allocation date).
 * @param {number} workingDays - Number of working days after which the coupon expires.
 * @returns {Date} - Expiration date set to 23:59:59 of the calculated day.
 */
export async function calculateExpiryDate(startDate, workingDays) {
  let remaining = workingDays;
  let current = new Date(startDate);
  // Ensure we start counting from the next day
  current.setUTCHours(0, 0, 0, 0);
  while (remaining > 0) {
    // Move one day forward
    current.setUTCDate(current.getUTCDate() + 1);
    const dayOfWeek = current.getUTCDay(); // 0=Sun,6=Sat
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue; // skip weekends
    }
    // Check holiday table (date only)
    const holiday = await prisma.holiday.findFirst({
      where: {
        date: {
          equals: current,
        },
      },
    });
    if (holiday) {
      continue; // skip official holidays
    }
    remaining -= 1; // count as a working day
  }
  // Set expiry to end of day (23:59:59 UTC)
  current.setUTCHours(23, 59, 59, 999);
  return current;
}
