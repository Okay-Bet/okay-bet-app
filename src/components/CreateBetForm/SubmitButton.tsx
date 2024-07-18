// components/CreateBetForm/SubmitButton.tsx
import React from "react";

interface SubmitButtonProps {
  isLoading: boolean;
  canSubmit: boolean;
}

const SubmitButton: React.FC<SubmitButtonProps> = ({ isLoading, canSubmit }) => {
  return (
    <button
      type="submit"
      disabled={isLoading || !canSubmit}
      className={`w-full p-4 bg-tertiary text-font font-heading rounded-lg transition-colors ${
        canSubmit ? "hover:bg-quaternary hover:text-primary hover:italic" : ""
      }`}
    >
      {isLoading ? "Creating Bet..." : "MAKE BET"}
    </button>
  );
};

export default SubmitButton;
