// components/CreateBetForm/UserInput.tsx
import React, { ChangeEvent, useEffect, useState } from "react";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import CircularProgress from "@mui/material/CircularProgress";
import WarningIcon from "@mui/icons-material/Warning";

interface UserInputProps {
  label: string;
  value: string;
  setValue: (value: string) => void;
  type: string;
  setType: (value: string) => void;
  valid: boolean;
  loading: boolean;
  warning?: string;
}

const UserInput: React.FC<UserInputProps> = ({
  label,
  value,
  setValue,
  type,
  setType,
  valid,
  loading,
  warning,
}) => {
  const [contactMethod, setContactMethod] = useState<string>("wallet");

  useEffect(() => {
    setType(contactMethod);
  }, [contactMethod, setType]);

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
    } else {
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
  };

  return (
    <div>
      <label htmlFor={label.toLowerCase()} className="block mb-2 font-heading">
        {label}
      </label>
      <div className="flex space-x-2 mb-2 bg-tertiary p-2">
        <div className="mr-10">
          <label className="flex items-center">
            <input
              type="radio"
              name={`${label.toLowerCase()}ContactMethod`}
              value="wallet"
              checked={contactMethod === "wallet"}
              onChange={() => setContactMethod("wallet")}
              className="mr-1"
            />
            Address/ENS
          </label>
        </div>
        <label className="flex items-center">
          <input
            type="radio"
            name={`${label.toLowerCase()}ContactMethod`}
            value="email"
            checked={contactMethod === "email"}
            onChange={() => setContactMethod("email")}
            className="mr-1"
          />
          Email
        </label>
        <label className="flex items-center">
          <input
            type="radio"
            name={`${label.toLowerCase()}ContactMethod`}
            value="phone"
            checked={contactMethod === "phone"}
            onChange={() => setContactMethod("phone")}
            className="mr-1"
          />
          Phone
        </label>
      </div>
      <div className="flex items-center bg-white">
        <input
          id={label.toLowerCase()}
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
          required
          placeholder={`Enter ${label} ${
            contactMethod === "wallet"
              ? "Address or ENS"
              : contactMethod === "email"
              ? "Email"
              : "Phone with country: +1"
          }`}
          className="w-full p-2 border text-black"
        />
        {renderValidationIcon()}
      </div>
      {warning && (
        <p className="text-font flex items-center mt-2">
          <WarningIcon fontSize="small" className="mr-1" />
          {warning}
        </p>
      )}
    </div>
  );
};

export default UserInput;
