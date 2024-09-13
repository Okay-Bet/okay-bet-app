import React, { useState, useEffect } from "react";
import { Slider, styled, Button, Tooltip } from "@mui/material";

interface ExpirationInputProps {
  expirationDays: number;
  handleExpirationChange: (value: number) => void;
  formatExpirationTime: (blocks: number) => string;
  expirationBlocks: number;
}

const WhiteSlider = styled(Slider)(({ theme }) => ({
  color: "white",
  width: "90%",
  margin: "0 auto",
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
    color: "black",
    fontWeight: "bold",
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  color: "white",
  borderColor: "white",
  "&:hover": {
    backgroundColor: "orange",
    borderColor: "orange",
    color: "black",
  },
}));

const ExpirationInput: React.FC<ExpirationInputProps> = ({
  expirationDays,
  handleExpirationChange,
  formatExpirationTime,
  expirationBlocks,
}) => {
  const [isAdjustable, setIsAdjustable] = useState(false);

  useEffect(() => {
    if (expirationDays === 0) {
      handleExpirationChange(30);
    }
  }, []);

  const toggleAdjustable = () => {
    setIsAdjustable(!isAdjustable);
  };

  const buttonText =
    expirationDays === 30 ? "1 Month" : `${expirationDays} days`;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
      <label className="font-heading text-white text-xl">Expiration</label>
      <Tooltip
          title={
            isAdjustable
              ? "Click to hide expiration time adjustment"
              : "Click to adjust expiration time"
          }
          arrow
        >
          <StyledButton
            variant="outlined"
            onClick={toggleAdjustable}
            size="small"
            className="mr-4 font-bold"
          >
            {buttonText}
          </StyledButton>
        </Tooltip>
      </div>
      {isAdjustable && (
        <div className="mt-4">
          <p className="text-sm text-quaternary mb-2 mx-5">
            After {formatExpirationTime(expirationBlocks)} this bet will be
            refunded if there is no Winner
          </p>
          <WhiteSlider
            value={expirationDays}
            onChange={(_, value) => handleExpirationChange(value as number)}
            min={7}
            max={365}
            step={1}
            marks={[
              { value: 7, label: "1 week" },
              { value: 365, label: "1 year" },
            ]}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${value} days`}
          />
        </div>
      )}
    </div>
  );
};

export default ExpirationInput;
