import React from "react";
import { Collapse, Slider, styled } from "@mui/material";
import AlertModal from "../Common/AlertModal";
import { useCreateBetForm } from "@/hooks/useCreateBetForm";
import ConditionsInput from "./ConditionsInput";
import UserInput from "./UserInput";
import WagerInput from "./WagerInput";
import SubmitButton from "./SubmitButton";

interface CreateBetFormProps {
  contract: any;
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
    ethToUsdRate,
    convertUsdToEth,
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

  // Dummy function for onProceed
  const dummyProceed = () => {};

  // Convert canSubmit to boolean
  const isSubmittable = Boolean(canSubmit);

  return (
    <div className="max-w-md mx-auto bg-primary text-quaternary">
      <button
        onClick={() => setIsFormVisible(!isFormVisible)}
        className="text-lg p-2 bg-primary text-quaternary font-bold font-heading italic rounded w-full mb-3 mt-3"
      >
        {isFormVisible ? "HIDE NEW BET" : "NEW BET"}
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
          <WagerInput
            wagerUSD={wagerUSD}
            setWagerUSD={setWagerUSD}
            usdcBalance={usdcBalance}
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
        onProceed={() => {}}
        showProceed={false}
      />
    </div>
  );
};

export default CreateBetForm;
