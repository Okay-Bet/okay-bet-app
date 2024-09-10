import React, { ChangeEvent } from "react";
import { ethers } from "ethers";

interface WagerInputProps {
  wagerUSD: string;
  setWagerUSD: (value: string) => void;
  usdcBalance: ethers.BigNumber;
}

const WagerInput: React.FC<WagerInputProps> = ({
  wagerUSD,
  setWagerUSD,
  usdcBalance,
}) => {
  const handleWagerChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow up to 6 decimal places for USDC
    if (/^\d*\.?\d{0,6}$/.test(value) || value === "") {
      setWagerUSD(value);
    }
  };

  const formattedBalance = ethers.utils.formatUnits(usdcBalance, 6);

  return (
    <div>
      <label htmlFor="wager" className="block mb-2 font-heading">
        Wager Amount (USDC)
      </label>
      <input
        id="wager"
        type="text"
        value={wagerUSD}
        onChange={handleWagerChange}
        required
        className="w-full p-2 border text-black"
        placeholder="How much USDC do you want to bet?"
      />
      <p className="text-sm text-quaternary mt-1">
        Your USDC Balance: {formattedBalance} USDC
      </p>
      {parseFloat(wagerUSD) > parseFloat(formattedBalance) && (
        <p className="text-sm text-red-500 mt-1">
          Warning: Wager amount exceeds your USDC balance
        </p>
      )}
    </div>
  );
};

export default WagerInput;
