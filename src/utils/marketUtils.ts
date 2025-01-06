// utils/marketUtils.ts
export const probabilityToDecimalOdds = (probability: number): number => {
  if (!probability || probability <= 0 || probability > 1) return 0;
  return 1 / probability;
};

export const decimalToMoneyline = (decimal: number): string => {
  if (!decimal || decimal <= 1) return "N/A";

  if (decimal >= 2.0) {
    // Underdog: positive moneyline
    return `+${Math.round((decimal - 1) * 100)}`;
  } else {
    // Favorite: negative moneyline
    return Math.round(-100 / (decimal - 1)).toString();
  }
};

export const formatPrice = (
  price: number | undefined,
  showMoneyline: boolean
): string => {
  if (!price) return "N/A";

  return showMoneyline
    ? decimalToMoneyline(probabilityToDecimalOdds(price))
    : `${(price * 100).toFixed(1)}%`;
};

export const formatExpiryDate = (dateStr: string | undefined): string => {
  if (!dateStr) return "No expiry date";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (e) {
    console.warn("Date parsing error:", e);
    return "Invalid date";
  }
};
