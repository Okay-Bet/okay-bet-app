import React, { useState } from "react";
import { Collapse, Tooltip } from "@mui/material";
import { useSendTransaction } from "thirdweb/react";
import { ethers } from "ethers";
import ShareButton from "../Common/ShareButton";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Link from "next/link";
import QRCodeModal from "../Common/QRCodeModal";
import { BetDetailsType } from "@/components/types/bet";
import BetActions from "./BetActions";
import CircularProgress from "@mui/material/CircularProgress";
import ExpirationTimer from "../Common/ExpirationTimer";
import { useWagerConversion } from "@/hooks/useWagerConversion";
import { formatCurrency, convertEthToUsd } from "@/utils/currencyUtils";

interface BetCardProps {
  bet: BetDetailsType;
  ethToUsdRate: number;
  usdcToUsdRate: number;
  accountAddress: string;
  fetchBetDetails: (betAddress: string) => Promise<BetDetailsType | null>;
  setMessage: (message: string) => void;
  setIsAlertOpen: (isOpen: boolean) => void;
  isLoading: boolean;
  initialOpen?: boolean;
  disableCollapse?: boolean;
}

type DisplayNameType =
  | string
  | { address: string | null; displayName: string }
  | undefined;

const BetCard: React.FC<BetCardProps> = ({
  bet,
  ethToUsdRate,
  usdcToUsdRate,
  accountAddress,
  fetchBetDetails,
  setMessage,
  setIsAlertOpen,
  isLoading,
  initialOpen = false,
  disableCollapse = false,
}) => {
  const { mutateAsync: sendTransaction } = useSendTransaction();
  const [localLoading, setLocalLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOpen, setIsOpen] = useState(initialOpen);
  const { makerWagerEth, takerWagerEth, makerWagerUsd, takerWagerUsd } =
    useWagerConversion(bet.totalWager, bet.wagerRatio);

  const isUsdcBet = bet.wagerCurrency !== ethers.constants.AddressZero;

  const getTotalWager = () => {
    if (isUsdcBet) {
      try {
        const totalWagerUsdc = ethers.utils.formatUnits(bet.totalWager, 6);
        const totalWagerUsdcNumber = parseFloat(totalWagerUsdc);

        if (isNaN(totalWagerUsdcNumber)) {
          console.error("Invalid USDC amount:", bet.totalWager);
          return "Invalid Amount";
        }

        if (typeof usdcToUsdRate !== "number" || isNaN(usdcToUsdRate)) {
          console.error("Invalid USDC to USD rate:", usdcToUsdRate);
          return `$${totalWagerUsdcNumber.toFixed(2)}`;
        }

        const totalWagerUsd = totalWagerUsdcNumber * usdcToUsdRate;
        return `$${totalWagerUsd.toFixed(2)}`;
      } catch (error) {
        console.error("Error calculating USDC wager:", error);
        return "Error calculating wager";
      }
    } else {
      try {
        const totalWagerEth = ethers.utils.formatEther(bet.totalWager);
        const totalWagerUsd = convertEthToUsd(totalWagerEth, ethToUsdRate);
        return `${totalWagerUsd} (${formatCurrency(totalWagerEth, "ETH")})`;
      } catch (error) {
        console.error("Error calculating ETH wager:", error);
        return "Error calculating wager";
      }
    }
  };

  const totalWagerDisplay = getTotalWager();

  const userIsMaker = accountAddress.toLowerCase() === bet.maker.toLowerCase();
  const userIsTaker = accountAddress.toLowerCase() === bet.taker.toLowerCase();
  const userIsJudge = accountAddress.toLowerCase() === bet.judge.toLowerCase();
  const canFund =
    (userIsMaker && bet.status !== 1) || (userIsTaker && bet.status !== 2);

  let bgColorClass = "bg-secondary";
  if (bet.status === 4) {
    bgColorClass = "bg-gray-600";
  } else if (
    bet.status === 3 &&
    bet.winner?.toLowerCase() === accountAddress.toLowerCase()
  ) {
    bgColorClass = "bg-green-600";
  }

  const getBetStatusText = () => {
    switch (bet.status) {
      case 0:
        return "Unfunded";
      case 1:
        return "Partially Funded";
      case 2:
        return "Funded";
      case 3:
        return "Resolved";
      case 4:
        return "Cancelled";
      default:
        return "Unknown Status";
    }
  };

  const isActiveBet = bet.status < 3; // Assuming statuses 0, 1, 2 are active

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const displayParticipantInfo = (
    address: string,
    displayName:
      | string
      | { address: string | null; displayName: string }
      | undefined
      | null
  ) => {
    let displayText = address;

    if (typeof displayName === "string") {
      if (displayName.includes(".eth")) {
        displayText = displayName;
      } else if (displayName.startsWith("0x")) {
        displayText = shortenAddress(displayName);
      } else {
        displayText = displayName;
      }
    } else if (displayName && typeof displayName === "object") {
      displayText = displayName.displayName || address;
    }

    return (
      <Tooltip title={address} arrow placement="top">
        <span className="cursor-help break-all">{displayText}</span>
      </Tooltip>
    );
  };

  const getDisplayName = (display: DisplayNameType): string => {
    if (typeof display === "object" && display !== null) {
      return display.displayName;
    }
    return display || "";
  };

  return (
    <div className="mb-6 relative">
      {(isRefreshing || isLoading) && (
        <div className="absolute inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-10">
          <CircularProgress />
        </div>
      )}
      <div
        className={`p-6 ${bgColorClass} text-font cursor-pointer`}
        onClick={() => !disableCollapse && setIsOpen(!isOpen)}
      >
        <h4 className="text-2xl font-bold break-words">{bet.conditions}</h4>
      </div>
      <Collapse in={isOpen}>
        <div className={`p-6 ${bgColorClass} text-font`}>
          <div className="grid grid-cols-1 gap-4 mb-2">
            <div className="p-4 bg-tertiary text-font">
              <span>
                Maker: {displayParticipantInfo(bet.maker, bet.makerDisplay)}
              </span>
            </div>
            <div className="p-4 bg-tertiary text-font">
              <span>
                Taker: {displayParticipantInfo(bet.taker, bet.takerDisplay)}
              </span>
            </div>
            <div className="p-4 bg-tertiary text-font">
              <span>
                Judge: {displayParticipantInfo(bet.judge, bet.judgeDisplay)}
              </span>
            </div>
          </div>
          <div className="inline-block mt-2 px-4 py-2 bg-blue-500 text-font rounded-lg">
            <div className="bold text-lg mb-1">Total Pot</div>
            <div>{totalWagerDisplay}</div>
          </div>
          {bet.status === 3 && bet.winner && (
            <div className="mt-2">
              <span>
                Winner: {displayParticipantInfo(bet.winner, bet.winnerDisplay)}
              </span>
            </div>
          )}
          {isActiveBet && (
            <div className="absolute bottom-2 left-2 text-sm text-gray-300">
              Expires in:{" "}
              <ExpirationTimer expirationBlock={bet.expirationBlock} />
            </div>
          )}
          <div className="justify-end items-center mt-4">
            <BetActions
              betDetails={bet}
              fetchBetDetails={fetchBetDetails}
              setMessage={setMessage}
              setIsAlertOpen={setIsAlertOpen}
              isLoading={localLoading}
              accountAddress={accountAddress}
              sendTransaction={sendTransaction}
              canFund={canFund}
              userIsDecider={userIsJudge}
              betStatusText={getBetStatusText()}
              setLocalLoading={setLocalLoading}
              usdcToUsdRate={usdcToUsdRate}
            />
          </div>
          <div className="flex justify-end items-center space-x-4 mt-4">
            <ShareButton
              makerDisplay={getDisplayName(bet.makerDisplay)}
              takerDisplay={getDisplayName(bet.takerDisplay)}
              judgeDisplay={getDisplayName(bet.judgeDisplay)}
              wagerEth={isUsdcBet ? undefined : makerWagerEth}
              wagerUsdc={isUsdcBet ? makerWagerEth : undefined}
              status={bet.status}
              conditions={bet.conditions}
              ethToUsdRate={ethToUsdRate}
              usdcToUsdRate={usdcToUsdRate}
              address={bet.address}
            />
            <QRCodeModal url={`https://www.okaybet.fun/bet/${bet.address}`} />
            <Link href={`/bet/${bet.address}`} passHref legacyBehavior>
              <a className="text-primary hover:text-quaternary cursor-pointer mt-1">
                <OpenInNewIcon />
              </a>
            </Link>
          </div>
        </div>
      </Collapse>
    </div>
  );
};

export default BetCard;
