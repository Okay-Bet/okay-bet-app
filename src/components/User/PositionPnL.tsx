// components/PositionPnL.tsx
interface PositionPnLProps {
    balance: number;
    currentPrice: number;
    entryPrice: number;
  }
  
  function PositionPnL({ balance, currentPrice, entryPrice }: PositionPnLProps) {
    if (balance === 0 || entryPrice === 0) return null;
    
    const currentValue = balance * currentPrice;
    const costBasis = balance * entryPrice;
    const pnl = currentValue - costBasis;
    const pnlPercentage = ((currentPrice - entryPrice) / entryPrice) * 100;
    
    const isPositive = pnl >= 0;
    const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
    
    return (
      <div className={`text-sm ${colorClass}`}>
        {isPositive ? '+' : ''}{pnl.toFixed(2)} USD ({isPositive ? '+' : ''}{pnlPercentage.toFixed(1)}%)
      </div>
    );
  }