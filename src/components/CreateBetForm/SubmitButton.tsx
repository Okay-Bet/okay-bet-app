// components/CreateBetForm/SubmitButton.tsx
import React from "react";

interface SubmitButtonProps {
  isLoading: boolean;
  isFunding: boolean;
  canSubmit: boolean;
}

const SubmitButton: React.FC<SubmitButtonProps> = ({ isLoading, isFunding, canSubmit }) => {
  let buttonText = "MAKE BET";
  if (isLoading) {
    buttonText = isFunding ? "Funding Bet..." : "Creating Bet...";
  }

  const isDisabled = isLoading || !canSubmit;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      className={`
        w-full p-4 bg-tertiary text-font font-heading rounded-lg transition-colors
        ${isDisabled 
          ? "cursor-not-allowed opacity-50" 
          : "hover:bg-quaternary hover:text-primary hover:italic"}
      `}
    >
      {buttonText}
    </button>
  );
};

export default SubmitButton;