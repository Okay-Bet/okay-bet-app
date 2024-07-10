"use client";
import React, { ChangeEvent, useState } from "react";
import { Collapse } from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import AlertModal from "./AlertModal";
import { useCreateBetForm } from "../hooks/useCreateBetForm";
import CircularProgress from "@mui/material/CircularProgress";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";

interface CreateBetFormProps {
  contract: any;
}

const CreateBetForm: React.FC<CreateBetFormProps> = ({ contract }) => {
  const {
    better1,
    setBetter1,
    better2,
    setBetter2,
    decider,
    setDecider,
    better1Type,
    setBetter1Type,
    better2Type,
    setBetter2Type,
    deciderType,
    setDeciderType,
    wagerUSD,
    setWagerUSD,
    conditions,
    setConditions,
    message,
    isLoading,
    isFormVisible,
    setIsFormVisible,
    isAlertOpen,
    setIsAlertOpen,
    handleSubmit,
    better1Valid,
    better2Valid,
    deciderValid,
    better1Loading,
    better2Loading,
    deciderLoading,
    canSubmit,
  } = useCreateBetForm(contract);

  const [better1ContactMethod, setBetter1ContactMethod] = useState<string>("wallet");
  const [better2ContactMethod, setBetter2ContactMethod] = useState<string>("wallet");
  const [deciderContactMethod, setDeciderContactMethod] = useState<string>("wallet");

  const renderValidationIcon = (isValid: boolean, isLoading: boolean) => {
    if (isLoading) {
      return <CircularProgress size={20} />;
    } else if (isValid) {
      return <CheckIcon style={{ color: "green" }} />;
    } else {
      return <CloseIcon style={{ color: "red" }} />;
    }
  };

  return (
    <div className="max-w-md mx-auto my-4 p-4 bg-primary text-quaternary rounded-lg shadow-lg">
      <button
        onClick={() => setIsFormVisible(!isFormVisible)}
        className="text-lg w-full p-2 bg-primary text-quaternary font-bold font-heading italic rounded"
      >
        {isFormVisible ? "NEW BET" : "NEW BET"}
      </button>
      <Collapse in={isFormVisible}>
        <form onSubmit={handleSubmit} className="p-6 bg-secondary text-font rounded space-y-4 shadow-lg">
          <Tooltip title="Your wallet address will be autofilled as Better 1" arrow>
            <div>
              <label htmlFor="better1" className="block mb-2">Better 1</label>
              <div className="flex space-x-2 mb-2">
                <label>
                  <input
                    type="radio"
                    name="better1ContactMethod"
                    value="wallet"
                    checked={better1ContactMethod === "wallet"}
                    onChange={() => {
                      setBetter1ContactMethod("wallet");
                      setBetter1Type("wallet");
                    }}
                  />
                  Address/ENS
                </label>
                <label>
                  <input
                    type="radio"
                    name="better1ContactMethod"
                    value="email"
                    checked={better1ContactMethod === "email"}
                    onChange={() => {
                      setBetter1ContactMethod("email");
                      setBetter1Type("email");
                    }}
                  />
                  Email
                </label>
                <label>
                  <input
                    type="radio"
                    name="better1ContactMethod"
                    value="phone"
                    checked={better1ContactMethod === "phone"}
                    onChange={() => {
                      setBetter1ContactMethod("phone");
                      setBetter1Type("phone");
                    }}
                  />
                  Phone
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="better1"
                  value={better1}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setBetter1(e.target.value)}
                  required
                  placeholder={`Enter Better 1 ${better1ContactMethod === 'wallet' ? 'Address or ENS' : better1ContactMethod === 'email' ? 'Email' : 'Phone'}`}
                  className="w-full p-2 border rounded text-black"
                />
                {renderValidationIcon(better1Valid, better1Loading)}
              </div>
            </div>
          </Tooltip>
          <Tooltip title="Enter the address, email, or phone number of the second bettor" arrow>
            <div>
              <label htmlFor="better2" className="block mb-2">Better 2</label>
              <div className="flex space-x-2 mb-2">
                <label>
                  <input
                    type="radio"
                    name="better2ContactMethod"
                    value="wallet"
                    checked={better2ContactMethod === "wallet"}
                    onChange={() => {
                      setBetter2ContactMethod("wallet");
                      setBetter2Type("wallet");
                    }}
                  />
                  Address/ENS
                </label>
                <label>
                  <input
                    type="radio"
                    name="better2ContactMethod"
                    value="email"
                    checked={better2ContactMethod === "email"}
                    onChange={() => {
                      setBetter2ContactMethod("email");
                      setBetter2Type("email");
                    }}
                  />
                  Email
                </label>
                <label>
                  <input
                    type="radio"
                    name="better2ContactMethod"
                    value="phone"
                    checked={better2ContactMethod === "phone"}
                    onChange={() => {
                      setBetter2ContactMethod("phone");
                      setBetter2Type("phone");
                    }}
                  />
                  Phone
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="better2"
                  value={better2}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setBetter2(e.target.value)}
                  required
                  placeholder={`Enter Better 2 ${better2ContactMethod === 'wallet' ? 'Address or ENS' : better2ContactMethod === 'email' ? 'Email' : 'Phone'}`}
                  className="w-full p-2 border rounded text-black"
                />
                {renderValidationIcon(better2Valid, better2Loading)}
              </div>
            </div>
          </Tooltip>
          <Tooltip title="Enter the address, email, or phone number of the decider" arrow>
            <div>
              <label htmlFor="decider" className="block mb-2">Decider</label>
              <div className="flex space-x-2 mb-2">
                <label>
                  <input
                    type="radio"
                    name="deciderContactMethod"
                    value="wallet"
                    checked={deciderContactMethod === "wallet"}
                    onChange={() => {
                      setDeciderContactMethod("wallet");
                      setDeciderType("wallet");
                    }}
                  />
                  Address/ENS
                </label>
                <label>
                  <input
                    type="radio"
                    name="deciderContactMethod"
                    value="email"
                    checked={deciderContactMethod === "email"}
                    onChange={() => {
                      setDeciderContactMethod("email");
                      setDeciderType("email");
                    }}
                  />
                  Email
                </label>
                <label>
                  <input
                    type="radio"
                    name="deciderContactMethod"
                    value="phone"
                    checked={deciderContactMethod === "phone"}
                    onChange={() => {
                      setDeciderContactMethod("phone");
                      setDeciderType("phone");
                    }}
                  />
                  Phone
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="decider"
                  value={decider}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setDecider(e.target.value)}
                  required
                  placeholder={`Enter Decider ${deciderContactMethod === 'wallet' ? 'Address or ENS' : deciderContactMethod === 'email' ? 'Email' : 'Phone'}`}
                  className="w-full p-2 border rounded text-black"
                />
                {renderValidationIcon(deciderValid, deciderLoading)}
              </div>
            </div>
          </Tooltip>
          <Tooltip title="Enter the amount of USD for the wager. It will be converted to ETH." arrow>
            <div>
              <label htmlFor="wager" className="block mb-2">Wager Amount (USD)</label>
              <input
                id="wager"
                type="number"
                step="0.01"
                value={wagerUSD}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setWagerUSD(e.target.value)}
                required
                className="w-full p-2 border rounded text-black"
              />
            </div>
          </Tooltip>
          <Tooltip title="Describe the conditions of the bet" arrow>
            <div>
              <label htmlFor="conditions" className="block mb-2">Conditions</label>
              <input
                id="conditions"
                value={conditions}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setConditions(e.target.value)}
                required
                className="w-full p-2 border rounded text-black"
              />
            </div>
          </Tooltip>
          <button type="submit" disabled={isLoading || !canSubmit} className="w-full p-4 bg-tertiary text-font font-heading rounded-lg hover:bg-quaternary transition-colors">
            {isLoading ? "Creating Bet..." : "Make Bet"}
          </button>
          {message && <p className="mt-4">{message}</p>}
        </form>
      </Collapse>
      <AlertModal isOpen={isAlertOpen} message={message} onClose={() => setIsAlertOpen(false)} />
    </div>
  );
};

export default CreateBetForm;
