"use client";
import React, { ChangeEvent, useState, useEffect } from "react";
import { Collapse } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import WarningIcon from "@mui/icons-material/Warning";
import AlertModal from "./AlertModal";
import { useCreateBetForm } from "../hooks/useCreateBetForm";
import CircularProgress from "@mui/material/CircularProgress";

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

  const [better1ContactMethod, setBetter1ContactMethod] =
    useState<string>("wallet");
  const [better2ContactMethod, setBetter2ContactMethod] =
    useState<string>("wallet");
  const [deciderContactMethod, setDeciderContactMethod] =
    useState<string>("wallet");
  const [deciderWarning, setDeciderWarning] = useState<string>("");

  const [resolvedBetter2, setResolvedBetter2] = useState<string>("");
  const [resolvedDecider, setResolvedDecider] = useState<string>("");

  useEffect(() => {
    if (decider && (decider === better1 || decider === better2)) {
      setDeciderWarning(
        "Warning: The decider address matches one of the betters."
      );
    } else {
      setDeciderWarning("");
    }
  }, [decider, better1, better2]);

  const renderValidationIcon = (isValid: boolean, isLoading: boolean) => {
    if (isLoading) {
      return <CircularProgress size={20} />;
    } else if (isValid) {
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

  const handleResolveUsername = async (username: string) => {
    try {
      const res = await fetch(`/api/resolve?username=${username}`);
      const data = await res.json();
      if (res.ok) {
        return data.walletAddress;
      } else {
        throw new Error(data.message || "Username not found");
      }
    } catch (error) {
      console.error("Error resolving username:", error);
      return "";
    }
  };

  const handleBetter2Change = async (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBetter2(value);
    setBetter2Loading(true);

    const delayDebounceFn = setTimeout(async () => {
      if (better2ContactMethod === "username") {
        const resolvedAddress = await handleResolveUsername(value);
        setResolvedBetter2(resolvedAddress);
        setBetter2Valid(resolvedAddress !== "");
      } else {
        setResolvedBetter2("");
      }
      setBetter2Loading(false);
    }, 2000);

    return () => clearTimeout(delayDebounceFn);
  };

  const handleDeciderChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDecider(value);
    setDeciderLoading(true);

    const delayDebounceFn = setTimeout(async () => {
      if (deciderContactMethod === "username") {
        const resolvedAddress = await handleResolveUsername(value);
        setResolvedDecider(resolvedAddress);
        setDeciderValid(resolvedAddress !== "");
      } else {
        setResolvedDecider("");
      }
      setDeciderLoading(false);
    }, 2000);

    return () => clearTimeout(delayDebounceFn);
  };

  return (
    <div className="max-w-md mx-auto  bg-primary text-quaternary">
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
          <div>
            <label htmlFor="better1" className="block mb-2 font-heading">
              Bettor 1 (Your Account)
            </label>
            <div className="flex items-center bg-white">
              <input
                id="better1"
                value={better1}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setBetter1(e.target.value)
                }
                required
                placeholder="Your address is autofilled"
                className="w-full p-2 border text-black"
              />
              {renderValidationIcon(better1Valid, better1Loading)}
            </div>
            <p className="text-sm text-quaternary mt-1">
              This is your connected wallet address
            </p>
          </div>

          <div>
            <label htmlFor="better2" className="block mb-2 font-heading">
              Bettor 2
            </label>
            <div className="flex space-x-2 mb-2 bg-tertiary p-2">
              <div className="mr-10">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="better2ContactMethod"
                    value="wallet"
                    checked={better2ContactMethod === "wallet"}
                    onChange={() => {
                      setBetter2ContactMethod("wallet");
                      setBetter2Type("wallet");
                      setResolvedBetter2("");
                    }}
                    className="mr-1"
                  />
                  Address/ENS
                </label>
              </div>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="better2ContactMethod"
                  value="email"
                  checked={better2ContactMethod === "email"}
                  onChange={() => {
                    setBetter2ContactMethod("email");
                    setBetter2Type("email");
                    setResolvedBetter2("");
                  }}
                  className="mr-1"
                />
                Email
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="better2ContactMethod"
                  value="phone"
                  checked={better2ContactMethod === "phone"}
                  onChange={() => {
                    setBetter2ContactMethod("phone");
                    setBetter2Type("phone");
                    setResolvedBetter2("");
                  }}
                  className="mr-1"
                />
                Phone
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="better2ContactMethod"
                  value="username"
                  checked={better2ContactMethod === "username"}
                  onChange={() => {
                    setBetter2ContactMethod("username");
                    setBetter2Type("username");
                    setBetter2Valid(false);
                    setBetter2Loading(true);
                    setResolvedBetter2("");
                  }}
                  className="mr-1"
                />
                Username
              </label>
            </div>
            <div className="flex items-center bg-white">
              <input
                id="better2"
                value={better2}
                onChange={handleBetter2Change}
                required
                placeholder={`Enter Bettor 2 ${
                  better2ContactMethod === "wallet"
                    ? "Address or ENS"
                    : better2ContactMethod === "email"
                    ? "Email"
                    : better2ContactMethod === "phone"
                    ? "Phone with country code"
                    : "Username"
                }`}
                className="w-full p-2 border text-black"
              />
              {renderValidationIcon(better2Valid, better2Loading)}
            </div>
            {resolvedBetter2 && (
              <p className="text-sm text-quaternary mt-1">
                Resolved Address: {resolvedBetter2}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="decider" className="block mb-2 font-heading">
              Decider
            </label>
            <div className="flex space-x-2 mb-2 bg-tertiary p-2 rounded">
              <div className="mr-10">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="deciderContactMethod"
                    value="wallet"
                    checked={deciderContactMethod === "wallet"}
                    onChange={() => {
                      setDeciderContactMethod("wallet");
                      setDeciderType("wallet");
                      setResolvedDecider("");
                    }}
                    className="mr-1"
                  />
                  Address/ENS
                </label>
              </div>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="deciderContactMethod"
                  value="email"
                  checked={deciderContactMethod === "email"}
                  onChange={() => {
                    setDeciderContactMethod("email");
                    setDeciderType("email");
                    setResolvedDecider("");
                  }}
                  className="mr-1"
                />
                Email
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="deciderContactMethod"
                  value="phone"
                  checked={deciderContactMethod === "phone"}
                  onChange={() => {
                    setDeciderContactMethod("phone");
                    setDeciderType("phone");
                    setResolvedDecider("");
                  }}
                  className="mr-1"
                />
                Phone
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="deciderContactMethod"
                  value="username"
                  checked={deciderContactMethod === "username"}
                  onChange={() => {
                    setDeciderContactMethod("username");
                    setDeciderType("username");
                    setDeciderValid(false);
                    setDeciderLoading(true);
                    setResolvedDecider("");
                  }}
                  className="mr-1"
                />
                Username
              </label>
            </div>
            <div className="flex items-center bg-white">
              <input
                id="decider"
                value={decider}
                onChange={handleDeciderChange}
                required
                placeholder={`Enter Decider ${
                  deciderContactMethod === "wallet"
                    ? "Address or ENS"
                    : deciderContactMethod === "email"
                    ? "Email"
                    : deciderContactMethod === "phone"
                    ? "Phone with country code"
                    : "Username"
                }`}
                className="w-full p-2 border text-black"
              />
              {renderValidationIcon(deciderValid, deciderLoading)}
            </div>
            {resolvedDecider && (
              <p className="text-sm text-quaternary mt-1">
                Resolved Address: {resolvedDecider}
              </p>
            )}
            {deciderWarning && (
              <p className="text-font flex items-center mt-2">
                <WarningIcon fontSize="small" className="mr-1" />
                {deciderWarning}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="wager" className="block mb-2 font-heading">
              Wager Amount (USD)
            </label>
            <input
              id="wager"
              type="number"
              step="0.01"
              value={wagerUSD}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setWagerUSD(e.target.value)
              }
              required
              className="w-full p-2 border text-black"
              placeholder="The payout is 2x the wager"
            />
            <p className="text-sm text-quaternary mt-1">
              {convertUsdToEth(wagerUSD)} ETH
              {ethToUsdRate > 0 && ` (1 ETH = $${ethToUsdRate.toFixed(2)})`}
            </p>
          </div>

          <div>
            <label htmlFor="conditions" className="block mb-2 font-heading">
              Conditions
            </label>
            <textarea
              id="conditions"
              value={conditions}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setConditions(e.target.value)
              }
              required
              className="w-full p-2 border text-black"
              rows={4}
              placeholder="Describe the conditions of the bet"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !canSubmit}
            className={`w-full p-4 bg-tertiary text-font font-heading rounded-lg transition-colors ${
              canSubmit
                ? "hover:bg-quaternary hover:text-primary hover:italic"
                : ""
            }`}
          >
            {isLoading ? "Creating Bet..." : "MAKE BET"}
          </button>

          {message && <p className="mt-4">{message}</p>}
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
