// utils/currencyUtils.ts

export const formatCurrency = (
    amount: number | string,
    currency: 'USD' | 'ETH' = 'USD',
    sigFigs: number = 3
  ): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(num)) return '0';
    
    if (currency === 'USD') {
      return `$${num.toFixed(2)}`;
    }
    
    // For ETH, use significant figures
    if (num === 0) return '0';
    const magnitude = Math.floor(Math.log10(Math.abs(num))) + 1;
    const scale = Math.pow(10, sigFigs - magnitude);
    const rounded = Math.round(num * scale) / scale;
    return `${rounded} ETH`;
  };
  
  export const convertEthToUsd = (ethAmount: string | number, ethToUsdRate: number): string => {
    const ethNum = typeof ethAmount === 'string' ? parseFloat(ethAmount) : ethAmount;
    const usdAmount = ethNum * ethToUsdRate;
    return formatCurrency(usdAmount, 'USD');
  };