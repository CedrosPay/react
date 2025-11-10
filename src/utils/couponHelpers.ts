import type { SettlementResponse } from "../types";

/**
 * Parse coupon codes from metadata
 *
 * Parses comma-separated coupon codes from the coupon_codes field
 *
 * @param metadata - Metadata object from settlement response or cart callback
 * @returns Array of coupon codes that were applied
 *
 * @example
 * // Multiple coupons
 * parseCouponCodes({ coupon_codes: "SITE10,CRYPTO5AUTO,SAVE20" })
 * // Returns: ["SITE10", "CRYPTO5AUTO", "SAVE20"]
 *
 * @example
 * // Single coupon
 * parseCouponCodes({ coupon_codes: "SAVE20" })
 * // Returns: ["SAVE20"]
 *
 * @example
 * // No coupons applied
 * parseCouponCodes({})
 * // Returns: []
 */
export function parseCouponCodes(
  metadata?: Record<string, string | undefined> | SettlementResponse["metadata"]
): string[] {
  if (!metadata || !metadata.coupon_codes) {
    return [];
  }

  return metadata.coupon_codes
    .split(",")
    .map((code) => code.trim())
    .filter((code) => code.length > 0);
}

/**
 * Format coupon codes for display
 *
 * @param coupons - Array of coupon codes
 * @param separator - Separator string (default: ", ")
 * @returns Formatted string
 *
 * @example
 * formatCouponCodes(["SITE10", "CRYPTO5AUTO", "SAVE20"])
 * // Returns: "SITE10, CRYPTO5AUTO, SAVE20"
 */
export function formatCouponCodes(
  coupons: string[],
  separator: string = ", "
): string {
  return coupons.join(separator);
}

/**
 * Calculate total discount percentage
 *
 * @param originalAmount - Original price before discounts
 * @param discountedAmount - Final price after discounts
 * @returns Discount percentage (0-100)
 *
 * @example
 * calculateDiscountPercentage(100, 75)
 * // Returns: 25.0
 */
export function calculateDiscountPercentage(
  originalAmount: number,
  discountedAmount: number
): number {
  if (originalAmount <= 0) return 0;
  const discount = originalAmount - discountedAmount;
  return (discount / originalAmount) * 100;
}
