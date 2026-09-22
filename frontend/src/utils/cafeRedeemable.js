export const remainingEarnedMeals = (employee) => {
  if (!employee) return 0;
  const earned = Math.max(0, Number(employee.dailyCap) || 0);
  const used = Math.max(0, Number(employee.claimedThisWeek) || 0);
  const leftover = Math.max(0, earned - used);
  const fromApi = Number(employee.couponsRedeemableNow);
  const available = Number(employee.availableCoupons);
  const cappedByApi = Number.isFinite(fromApi) ? Math.min(leftover, fromApi) : leftover;
  const cappedByWallet = Number.isFinite(available) ? Math.min(cappedByApi, available) : cappedByApi;
  return Math.max(0, cappedByWallet);
};
