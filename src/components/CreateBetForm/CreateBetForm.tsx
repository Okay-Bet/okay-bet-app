// components/CreateBetForm/CreateBetForm.tsx
"use client";
import React, { useEffect, useState } from "react";
import { Collapse } from "@mui/material";
import AlertModal from "../Common/AlertModal";
import { useCreateBetForm } from "@/hooks/useCreateBetForm";
import ConditionsInput from "./ConditionsInput";
import UserInput from "./UserInput";
import WagerInput from "./WagerInput";
import SubmitButton from "./SubmitButton";

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
    ethToUsdRate,
    convertUsdToEth,
  } = useCreateBetForm(contract);
  const [deciderWarning, setDeciderWarning] = useState<string>("");

  useEffect(() => {
    if (decider && (decider === better1 || decider === better2)) {
      setDeciderWarning(
        "Warning: The decider address matches one of the betters."
      );
    } else {
      setDeciderWarning("");
    }
  }, [decider, better1, better2]);

  return (
    <div className="max-w-md mx-auto bg-primary text-quaternary">
      <button
        onClick={() => setIsFormVisible(!isFormVisible)}
        className="text-lg p-2 bg-primary text-quaternary font-bold font-heading italic rounded w-full mb-3 mt-3"
      >
        {isFormVisible ? "NEW BET" : "NEW BET"}
      </button>
      <Collapse in={isFormVisible}>
        <form
          onSubmit={handleSubmit}
          className="p-6 bg-secondary text-font font-bold space-y-6"
        >
          <ConditionsInput
            conditions={conditions}
            setConditions={setConditions}
          />
          <UserInput
            label="Maker (Your Account)"
            value={better1}
            setValue={setBetter1}
            type={better1Type}
            setType={setBetter1Type}
            valid={better1Valid}
            loading={better1Loading}
          />
          <UserInput
            label="Taker"
            value={better2}
            setValue={setBetter2}
            type={better2Type}
            setType={setBetter2Type}
            valid={better2Valid}
            loading={better2Loading}
          />
          <UserInput
            label="Judge"
            value={decider}
            setValue={setDecider}
            type={deciderType}
            setType={setDeciderType}
            valid={deciderValid}
            loading={deciderLoading}
            warning={deciderWarning}
          />
          <WagerInput
            wagerUSD={wagerUSD}
            setWagerUSD={setWagerUSD}
            convertUsdToEth={convertUsdToEth}
            ethToUsdRate={ethToUsdRate}
          />
          <SubmitButton isLoading={isLoading} canSubmit={canSubmit} />
          {message && <p className="mt-4 text-center bold">{message}</p>}
        </form>
      </Collapse>
      <AlertModal
        isOpen={isAlertOpen}
        message={message}
        onClose={() => setIsAlertOpen(false)}
      />
    </div>
  );
};

export default CreateBetForm;