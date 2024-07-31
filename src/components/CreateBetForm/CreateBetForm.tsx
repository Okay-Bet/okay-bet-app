// components/CreateBetForm/CreateBetForm.tsx
import React from "react";
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
    wagerUSD,
    setWagerUSD,
    conditions,
    setConditions,
    message,
    isLoading,
    isFunding,
    isFormVisible,
    setIsFormVisible,
    isAlertOpen,
    setIsAlertOpen,
    handleSubmit,
    better1Valid,
    better2Valid,
    deciderValid,
    ethToUsdRate,
    convertUsdToEth,
    better1Loading,
    better2Loading,
    deciderLoading,
    canSubmit,
  } = useCreateBetForm(contract);

  return (
    <div className="max-w-md mx-auto bg-primary text-quaternary">
      <button
        onClick={() => setIsFormVisible(!isFormVisible)}
        className="text-lg p-2 bg-primary text-quaternary font-bold font-heading italic rounded w-full mb-3 mt-3"
      >
        {isFormVisible ? "CLOSE" : "NEW BET"}
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
            valid={better1Valid}
            loading={better1Loading}
          />
          <UserInput
            label="Taker"
            value={better2}
            setValue={setBetter2}
            valid={better2Valid}
            loading={better2Loading}
          />
          <UserInput
            label="Judge"
            value={decider}
            setValue={setDecider}
            valid={deciderValid}
            loading={deciderLoading}
          />
          <WagerInput
            wagerUSD={wagerUSD}
            setWagerUSD={setWagerUSD}
            convertUsdToEth={convertUsdToEth}
            ethToUsdRate={ethToUsdRate}
          />
          <SubmitButton
            isLoading={isLoading}
            isFunding={isFunding}
            canSubmit={canSubmit}
          />
        </form>
      </Collapse>
      <AlertModal
        isOpen={isAlertOpen}
        message={message}
        onClose={() => {
          setIsAlertOpen(false);
          if (!isLoading && !isFunding) {
            setIsFormVisible(false);
          }
        }}
      />
    </div>
  );
};

export default CreateBetForm;