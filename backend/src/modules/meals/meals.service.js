import prisma from '../../config/db.js';
import auditService from '../audit/audit.service.js';

function expiryDescription(days, locale) {
  if (locale === 'am') {
    return `በ${days} የስራ ቀናት ውስጥ ያበቃል`;
  }
  return `Expires in ${days} working days`;
}

class MealsService {
  /**
   * Creates a new meal config option (CouponConfig), logs action
   */
  async createMeal(data, actorId, req) {
    // Map meal data fields to CouponConfig
    const config = await prisma.couponConfig.create({
      data: {
        name: data.nameEn || 'Custom Meal Config',
        value: data.price,
        expiryWorkingDays: 5, // default to 5 working days as per system standard
        createdById: actorId,
      },
    });

    await auditService.log({
      action: 'MEAL_CREATE',
      entityType: 'CouponConfig',
      entityId: config.id,
      actorId,
      newState: config,
      req,
    });

    // Format output as a meal to satisfy the frontend UI expectations
    return {
      id: config.id,
      nameEn: config.name,
      nameAm: data.nameAm || data.nameEs || config.name,
      descriptionEn: expiryDescription(config.expiryWorkingDays, 'en'),
      descriptionAm: expiryDescription(config.expiryWorkingDays, 'am'),
      price: config.value,
      status: 'ACTIVE',
      createdAt: config.createdAt,
    };
  }

  /**
   * Returns list of meal configs, translating names/descriptions based on header locale
   */
  async getMeals(filters = {}, locale = 'en') {
    const configs = await prisma.couponConfig.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Dynamically map and localize CouponConfig fields to satisfy the meal expectations
    return configs.map((config) => ({
      id: config.id,
      name: config.name,
      description: expiryDescription(config.expiryWorkingDays, locale),
      price: config.value,
      status: 'ACTIVE',
      // Keep raw strings for form edits
      nameEn: config.name,
      nameAm: config.name,
      descriptionEn: expiryDescription(config.expiryWorkingDays, 'en'),
      descriptionAm: expiryDescription(config.expiryWorkingDays, 'am'),
      createdAt: config.createdAt,
    }));
  }

  /**
   * Updates an existing meal config, logs pre/post mutation states
   */
  async updateMeal(id, data, actorId, req) {
    const oldConfig = await prisma.couponConfig.findUnique({ where: { id } });
    if (!oldConfig) {
      throw new Error('Meal config not found');
    }

    const updatedConfig = await prisma.couponConfig.update({
      where: { id },
      data: {
        name: data.nameEn !== undefined ? data.nameEn : oldConfig.name,
        value: data.price !== undefined ? data.price : oldConfig.value,
      },
    });

    await auditService.log({
      action: 'MEAL_UPDATE',
      entityType: 'CouponConfig',
      entityId: id,
      actorId,
      oldState: oldConfig,
      newState: updatedConfig,
      req,
    });

    return {
      id: updatedConfig.id,
      nameEn: updatedConfig.name,
      nameAm: updatedConfig.name,
      descriptionEn: expiryDescription(updatedConfig.expiryWorkingDays, 'en'),
      descriptionAm: expiryDescription(updatedConfig.expiryWorkingDays, 'am'),
      price: updatedConfig.value,
      status: 'ACTIVE',
      createdAt: updatedConfig.createdAt,
    };
  }
}

export default new MealsService();
