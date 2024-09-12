import React from "react";
import { Slider, styled } from "@mui/material";

interface ExpirationInputProps {
  expirationDays: number;
  handleExpirationChange: (value: number) => void;
  formatExpirationTime: (blocks: number) => string;
  expirationBlocks: number;
}

// Styled Slider component
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
    '&[data-index="0"]': {
      transform: "translateX(0%)",
    },
    '&[data-index="1"]': {
      transform: "translateX(-100%)",
    },
  },
  "& .MuiSlider-valueLabel": {
    backgroundColor: "white",
    color: theme.palette.primary.main,
    fontWeight: "bold",
  },
}));

const ExpirationInput: React.FC<ExpirationInputProps> = ({
  expirationDays,
  handleExpirationChange,
  formatExpirationTime,
  expirationBlocks,
}) => {
  return (
    <div className="space-y-4 mx-7">
      <label className="block mb-2 font-heading">Expiration Time</label>
      <p className="text-sm text-quaternary">
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
  );
};

export default ExpirationInput;