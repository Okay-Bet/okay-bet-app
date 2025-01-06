// utils/marketUtils.ts
export const decimalToMoneyline = (decimal: number): string => {
    if (decimal >= 2) return `+${Math.round((decimal - 1) * 100)}`;
    return `-${Math.round(100 / (decimal - 1))}`;
  };
  
  export const formatPrice = (
    price: number | undefined,
    showMoneyline: boolean
  ): string => {
    if (!price) return "N/A";
    return showMoneyline
      ? decimalToMoneyline(price)
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