const CAFE_ERROR_KEYS = {
  ON_LEAVE: 'cafe.blockOnLeave',
  INACTIVE: 'cafe.blockInactive',
  NOT_FOUND: 'cafe.blockNotFound',
  QR_INVALID: 'cafe.blockQrInvalid',
  QR_BLOCKED: 'cafe.blockQrBlocked',
  NO_CAMPUS: 'cafe.campusMissing',
  NO_VENDOR: 'cafe.blockNoVendor',
  SCAN_REQUIRED: 'cafe.blockScanFirst',
  NO_COUPONS: 'cafe.blockNoCoupons',
  CAP_NOT_REACHED: 'cafe.blockFutureLocked',
  DUPLICATE_CLAIM: 'cafe.blockAlreadyUsed',
  HOLIDAY: 'cafe.recordDisabledHoliday',
  WEEKEND: 'cafe.recordDisabledWeekend',
  CLAIMED_TODAY: 'cafe.blockAlreadyUsed',
  NO_BALANCE: 'cafe.blockFutureLocked',
};

export const cafeBlockMessage = (t, code, fallback) => {
  const key = CAFE_ERROR_KEYS[code];
  if (key) return t(key);
  return fallback || t('cafe.verifyFailed');
};

export const cafeApiErrorMessage = (err, t, fallbackKey = 'cafe.verifyFailed') => {
  const data = err?.response?.data;
  return cafeBlockMessage(t, data?.code, data?.message || t(fallbackKey));
};
