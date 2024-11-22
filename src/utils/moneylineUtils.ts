// moneylineUtils.ts
// converts from prediciton market decimel odds to moneyline odds 

export const decimalToMoneyline = (decimal: number): string => {
    if (decimal >= 1) return "0";
    
    if (decimal <= .5) {
      // For underdogs (positive moneyline)
      return `+${Math.round(100/decimal-100)}`;
    } else {
      // For favorites (negative moneyline)
      return`-${Math.round(100/(1-decimal) -100)}`;
    }
  };