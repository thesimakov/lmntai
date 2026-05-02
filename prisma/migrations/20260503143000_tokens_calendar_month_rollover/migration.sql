-- AlterTable
ALTER TABLE "User" ADD COLUMN "tokensCalendarMonthCredited" TEXT;

UPDATE "User"
SET "tokensCalendarMonthCredited" =
  to_char(date_trunc('month', CURRENT_TIMESTAMP) - interval '1 month', 'YYYY-MM')
WHERE UPPER("plan") IN ('PRO', 'TEAM', 'BUSINESS');
