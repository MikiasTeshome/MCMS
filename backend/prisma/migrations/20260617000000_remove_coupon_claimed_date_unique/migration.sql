-- Migration: remove_coupon_claimed_date_unique
-- 
-- The @@unique([employeeId, claimedDateString]) index was originally designed to
-- prevent an employee from claiming more than one coupon per calendar day.
--
-- With the new weekly accumulation business logic, employees may redeem multiple
-- accumulated coupons in a single visit (e.g. 3 on Wednesday). The visit-once-per-day
-- rule is now enforced entirely at the application level via the claimedToday check
-- (which looks for claimedDateString STARTING WITH today's date string).
--
-- This migration drops the now-incorrect unique index.

DROP INDEX IF EXISTS "Coupon_employeeId_claimedDateString_key";
