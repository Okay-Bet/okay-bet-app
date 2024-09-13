import React, { ChangeEvent } from "react";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import CircularProgress from "@mui/material/CircularProgress";
import WarningIcon from "@mui/icons-material/Warning";

interface UserInputProps {
  label: string;
  value: string;
  displayValue: string;
  setValue: (value: string) => void;
  valid: boolean;
  loading: boolean;
  warning?: string;
  resolvedAddress?: string;
  resolvedUsername?: string;
}

const UserInput: React.FC<UserInputProps> = ({
  label,
  value,
  displayValue,
  setValue,
  valid,
  loading,
  warning,
  resolvedAddress,
  resolvedUsername,
}) => {
  const renderValidationIcon = () => {
    if (loading) {
      return <CircularProgress size={20} />;
    } else if (valid) {
      return (
        <CheckCircleIcon
          style={{
            color: "green",
            backgroundColor: "#e0e0e0",
            borderRadius: "50%",
          }}
        />
      );
    } else if (value) {
      return (
        <CancelIcon
          style={{
            color: "red",
            backgroundColor: "#e0e0e0",
            borderRadius: "50%",
          }}
        />
      );
    }
    return null;
  };

  const renderAdditionalInfo = () => {
    if (resolvedUsername && resolvedUsername !== value) {
      return <p className="text-xs mt-1">Username: {resolvedUsername}</p>;
    } else if (resolvedAddress && resolvedAddress !== value) {
      return (
        <p className="text-xs mt-1 text-white">Address: {resolvedAddress}</p>
      );
    }
    return null;
  };

  return (
    <div>
      <label htmlFor={label.toLowerCase()} className="block mb-2 font-heading">
        {label}
      </label>
      <div className="flex items-center bg-white text-xl">
        <input
          id={label.toLowerCase()}
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setValue(e.target.value)
          }
          required
          placeholder={`${label} username/address/ENS`}
          className="w-full p-2 border text-black text-base sm:text-lg"
        />
        {renderValidationIcon()}
      </div>
      {renderAdditionalInfo()}
      {warning && (
        <p className="text-font flex items-center mt-2 text-sm">
          <WarningIcon fontSize="small" className="mr-1" />
          {warning}
        </p>
      )}
    </div>
  );
};

export default UserInput;
