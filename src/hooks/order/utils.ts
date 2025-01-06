// src/hooks/order/utils.ts

export const toUSDCUnits = (value: number): string => {
    return Math.round(value * 1_000_000).toString();
  };