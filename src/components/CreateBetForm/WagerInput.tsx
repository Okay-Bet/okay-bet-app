// components/CreateBetForm/WagerInput.tsx
import React, { ChangeEvent } from "react";

interface WagerInputProps {
  wagerUSD: string;
  setWagerUSD: (value: string) => void;
  convertUsdToEth: (usdAmount: string) => string;
  ethToUsdRate: number;
}

const WagerInput: React.FC<WagerInputProps> = ({
  wagerUSD,
  setWagerUSD,
  convertUsdToEth,
  ethToUsdRate,
}) => {
  return (
    <div>
      <label htmlFor="wager" className="block mb-2 font-heading">
        Wager Amount (USD)
      </label>
      <input
        id="wager"
        type="number"
        step="0.01"
        value={wagerUSD}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setWagerUSD(e.target.value)}
        required
        className="w-full p-2 border text-black"
        placeholder="How much do you want to bet?"
      />
      <p className="text-sm text-quaternary mt-1">
        {convertUsdToEth(wagerUSD)} ETH
        {ethToUsdRate > 0 && ` (1 ETH = $${ethToUsdRate.toFixed(2)})`}
      </p>
    </div>
  );
};

export default WagerInput;
