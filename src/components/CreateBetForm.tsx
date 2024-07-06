// components/CreateBetForm.tsx
"use client";
import React, { ChangeEvent, FormEvent } from "react";
import { Collapse } from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import AlertModal from "./AlertModal";
import { useCreateBetForm } from "../hooks/useCreateBetForm";

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
  } = useCreateBetForm(contract);

  return (
    <div className="max-w-md mx-auto my-4 p-4 bg-primary text-quaternary rounded-lg shadow-lg">
      <button
        onClick={() => setIsFormVisible(!isFormVisible)}
        className="text-lg w-full p-2 bg-primary text-quaternary font-bold font-heading rounded"
      >
        {isFormVisible ? "Hide Form" : "Make a Bet"}
      </button>
      <Collapse in={isFormVisible}>
        <form onSubmit={handleSubmit} className="p-6 bg-secondary text-font rounded space-y-4 shadow-lg">
          <Tooltip title="Your wallet address will be autofilled as Better 1" arrow>
            <div>
              <label htmlFor="better1" className="block mb-2">Better 1 Address or ENS</label>
              <input
                id="better1"
                value={better1}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setBetter1(e.target.value)}
                required
                className="w-full p-2 border rounded text-black"
              />
            </div>
          </Tooltip>
          <Tooltip title="Enter the address or ENS of the second bettor" arrow>
            <div>
              <label htmlFor="better2" className="block mb-2">Better 2 Address or ENS</label>
              <input
                id="better2"
                value={better2}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setBetter2(e.target.value)}
                required
                className="w-full p-2 border rounded text-black"
              />
            </div>
          </Tooltip>
          <Tooltip title="Enter the address or ENS of the decider" arrow>
            <div>
              <label htmlFor="decider" className="block mb-2">Decider Address or ENS</label>
              <input
                id="decider"
                value={decider}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDecider(e.target.value)}
                required
                className="w-full p-2 border rounded text-black"
              />
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
          <button type="submit" disabled={isLoading} className="w-full p-4 bg-tertiary text-font font-heading rounded-lg hover:bg-quaternary transition-colors">
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
