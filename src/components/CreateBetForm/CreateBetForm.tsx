import React from "react";
import { Collapse } from "@mui/material";
import AlertModal from "../Common/AlertModal";
import { useCreateBetForm } from "@/hooks/useCreateBetForm";
import ConditionsInput from "./ConditionsInput";
import UserInput from "./UserInput";
import WagerInput from "./WagerInput";
import SubmitButton from "./SubmitButton";
import ExpirationInput from "./ExpirationInput";

interface CreateBetFormProps {
  contract: any;
}

const CreateBetForm: React.FC<CreateBetFormProps> = ({ contract }) => {
  const {
    maker,
    setMaker,
    taker,
    setTaker,
    judge,
    setJudge,
    makerDisplayName,
    takerDisplayName,
    judgeDisplayName,
    makerAddress,
    takerAddress,
    judgeAddress,
    wagerUSD,
    setWagerUSD,
    wagerRatio,
    setWagerRatio,
    isTiltedBet,
    toggleTiltedBet,
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
    makerValid,
    takerValid,
    judgeValid,
    makerLoading,
    takerLoading,
    judgeLoading,
    canSubmit,
    expirationDays,
    handleExpirationChange,
    expirationBlocks,
    formatExpirationTime,
    usdcBalance,
  } = useCreateBetForm(contract);

  // Convert canSubmit to boolean
  const isSubmittable = Boolean(canSubmit);

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
            value={maker}
            displayValue={makerDisplayName}
            setValue={setMaker}
            valid={makerValid}
            loading={makerLoading}
            resolvedAddress={makerAddress || undefined}
            resolvedUsername={
              makerDisplayName !== makerAddress ? makerDisplayName : undefined
            }
          />
          <UserInput
            label="Taker"
            value={taker}
            displayValue={takerDisplayName}
            setValue={setTaker}
            valid={takerValid}
            loading={takerLoading}
            resolvedAddress={takerAddress || undefined}
            resolvedUsername={
              takerDisplayName !== takerAddress ? takerDisplayName : undefined
            }
          />
          <UserInput
            label="Judge"
            value={judge}
            displayValue={judgeDisplayName}
            setValue={setJudge}
            valid={judgeValid}
            loading={judgeLoading}
            resolvedAddress={judgeAddress || undefined}
            resolvedUsername={
              judgeDisplayName !== judgeAddress ? judgeDisplayName : undefined
            }
          />
          <WagerInput
            wagerUSD={wagerUSD}
            setWagerUSD={setWagerUSD}
            usdcBalance={usdcBalance}
            isTiltedBet={isTiltedBet}
            toggleTiltedBet={toggleTiltedBet}
            wagerRatio={wagerRatio}
            setWagerRatio={setWagerRatio}
          />
          <ExpirationInput
            expirationDays={expirationDays}
            handleExpirationChange={handleExpirationChange}
            formatExpirationTime={formatExpirationTime}
            expirationBlocks={expirationBlocks}
          />
          <SubmitButton
            isLoading={isLoading}
            isFunding={isFunding}
            canSubmit={isSubmittable}
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
        onProceed={() => {}}
        showProceed={false}
      />
    </div>
  );
};

export default CreateBetForm;
