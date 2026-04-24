/** UI billing period for Pro/Team: monthly, 3 months (10% off), 12 months (15% off). */
export type BillingPeriod = "monthly" | "quarter" | "yearly";

const QUARTER_DISCOUNT = 0.1;
const YEAR_DISCOUNT = 0.15;

export function subscriptionBillingMinor(
  monthlyMinor: number,
  period: BillingPeriod
): { totalMinor: number; periodMonths: number; effectiveMonthlyMinor: number } {
  if (period === "monthly") {
    return {
      totalMinor: monthlyMinor,
      periodMonths: 1,
      effectiveMonthlyMinor: monthlyMinor,
    };
  }
  if (period === "quarter") {
    const totalMinor = Math.round(monthlyMinor * 3 * (1 - QUARTER_DISCOUNT));
    return {
      totalMinor,
      periodMonths: 3,
      effectiveMonthlyMinor: Math.round(totalMinor / 3),
    };
  }
  const totalMinor = Math.round(monthlyMinor * 12 * (1 - YEAR_DISCOUNT));
  return {
    totalMinor,
    periodMonths: 12,
    effectiveMonthlyMinor: Math.round(totalMinor / 12),
  };
}
