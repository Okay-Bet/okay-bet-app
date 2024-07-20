import React, { useEffect } from "react";
import { useContract, useContractEvents } from "@thirdweb-dev/react";
import CircularProgress from "@mui/material/CircularProgress";
import betABI  from "../../constants/betABI.json";  // Import your contract ABI

interface ContractEventListenerProps {
  contractAddress: string;
  eventName: string;
  onEvent: (events: any) => void;  // Function to handle the event
  blockRange?: number;
  enabled?: boolean;
  watch?: boolean;
}

const ContractEventListener: React.FC<ContractEventListenerProps> = ({
  contractAddress,
  eventName,
  onEvent,
  blockRange = 2000,
  enabled = true,
  watch = true,
}) => {
  const { contract } = useContract(contractAddress, betABI);
  const { data: events, isLoading } = useContractEvents(contract, eventName, {
    queryFilter: { fromBlock: 0, toBlock: 'latest', order: 'asc' },
    subscribe: watch,
  });

  useEffect(() => {
    if (events) {
      console.log("Events", events);
      onEvent(events);
    }
  }, [events]);

  if (isLoading) {
    return <CircularProgress size={24} />;
  }

  return null;
};

export default ContractEventListener;
