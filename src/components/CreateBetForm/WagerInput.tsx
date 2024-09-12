import React, { ChangeEvent, useState } from "react";
import { ethers } from "ethers";
import { Slider, styled, Button, TextField, Tooltip } from "@mui/material";

interface WagerInputProps {
  wagerUSD: string;
  setWagerUSD: (value: string) => void;
  usdcBalance: ethers.BigNumber;
}

const WhiteSlider = styled(Slider)(({ theme }) => ({
  color: "white",
  "& .MuiSlider-thumb": {
    backgroundColor: "white",
  },
  "& .MuiSlider-track": {
    backgroundColor: "white",
  },
  "& .MuiSlider-rail": {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  "& .MuiSlider-mark": {
    backgroundColor: "white",
  },
  "& .MuiSlider-markLabel": {
    color: "white",
    fontWeight: "bold",
    fontSize: "0.875rem",
  },
  "& .MuiSlider-valueLabel": {
    backgroundColor: "white",
    color: theme.palette.primary.main,
    fontWeight: "bold",
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  color: "white",
  borderColor: "white",
  "&:hover": {
    backgroundColor: "#DC5F00",
    borderColor: "#DC5F00",
    color: "black",
  },
}));

const WagerInput: React.FC<WagerInputProps> = ({
  wagerUSD,
  setWagerUSD,
  usdcBalance,
}) => {
  const [ratio, setRatio] = useState<number>(50);
  const [isTilted, setIsTilted] = useState<boolean>(false);
  const [manualRatio, setManualRatio] = useState<string>("50.00");

  const handleWagerChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,6}$/.test(value) || value === "") {
      setWagerUSD(value);
    }
  };

  const handleRatioChange = (event: Event, newValue: number | number[]) => {
    const newRatio = newValue as number;
    setRatio(newRatio);
    setManualRatio(newRatio.toFixed(2));
  };

  const handleManualRatioChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d{1,3}(\.\d{0,2})?$/.test(value) && parseFloat(value) <= 100) {
      setManualRatio(value);
      setRatio(parseFloat(value));
    } else if (value === "") {
      setManualRatio("");
    }
  };

  const toggleTiltedBet = () => {
    setIsTilted(!isTilted);
    if (!isTilted) {
      setRatio(50);
      setManualRatio("50.00");
    }
  };

  const formattedBalance = ethers.utils.formatUnits(usdcBalance, 6);
  const makerWager = parseFloat(wagerUSD) * (ratio / 100);
  const takerWager = parseFloat(wagerUSD) * ((100 - ratio) / 100);

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="wager" className="block mb-2 font-heading">
          Total Pot in USDC
        </label>
        <input
          id="wager"
          type="text"
          value={wagerUSD}
          onChange={handleWagerChange}
          required
          className="w-full p-2 border text-black"
          placeholder="How much do you want to bet?"
        />
        <p className="text-sm text-quaternary mt-1">
          Your Balance: {formattedBalance} USDC
        </p>
        {parseFloat(wagerUSD) > parseFloat(formattedBalance) && (
          <p className="text-sm text-red-500 mt-1">
            Warning: Wager amount exceeds your USDC balance
          </p>
        )}
      </div>
      <div>
        <Tooltip
          title={
            isTilted
              ? "Tilted Bet: Allows uneven wager amounts between Maker and Taker"
              : "Even Bet: Both Maker and Taker contribute equally to the pot"
          }
          arrow
        >
          <StyledButton
            variant="outlined"
            onClick={toggleTiltedBet}
            className="mb-2 font-bold"
          >
            {isTilted ? "Tilted Bet" : "Even Bet"}
          </StyledButton>
        </Tooltip>
        {isTilted && (
          <div className="mt-4">
            <div className="flex items-center space-x-4 mb-2">
              <WhiteSlider
                value={ratio}
                onChange={handleRatioChange}
                aria-labelledby="wager-ratio-slider"
                valueLabelDisplay="auto"
                step={0.01}
                min={1}
                max={100}
                sx={{ flex: 1 }}
              />
              <TextField
                value={manualRatio}
                onChange={handleManualRatioChange}
                variant="outlined"
                size="small"
                inputProps={{ min: 0, max: 100, step: 0.01 }}
                sx={{
                  width: "80px",
                  input: { color: "white" },
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "white" },
                    "&:hover fieldset": { borderColor: "white" },
                    "&.Mui-focused fieldset": { borderColor: "white" },
                  },
                }}
              />
              <span className="text-white">%</span>
            </div>
            <div className="flex justify-between text-sm text-white">
              <span>
                Maker funds ${makerWager.toFixed(2)} USDC
              </span>
              <span>
                Taker funds ${takerWager.toFixed(2)} USDC
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WagerInput;
