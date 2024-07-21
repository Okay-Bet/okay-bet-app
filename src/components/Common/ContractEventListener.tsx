import React, { useEffect } from "react";
import { useContract, useContractEvents } from "@thirdweb-dev/react";
import CircularProgress from "@mui/material/CircularProgress";
import betABI from "../../constants/betABI.json"; 

interface ContractEventListenerProps {
  contractAddress: string;
  eventName: string;
  onEvent: (events: any) => void;
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
  console.log("Contract address:", contractAddress);
  const { contract, error: contractError } = useContract(contractAddress, betABI);

  useEffect(() => {
    if (contractError) {
      console.error("Error in useContract:", contractError);
    }
  }, [contractError]);

  const { data: events, isLoading, error } = useContractEvents(contract, eventName, {
    queryFilter: { fromBlock: 0, toBlock: 'latest', order: 'asc' },
    subscribe: watch,
  });

  useEffect(() => {
    if (error) {
      console.error("Error fetching events:", error);
    }

    if (events && events.length > 0) {
      console.log(`Events for ${eventName}`, events);
      onEvent(events);
    } else {
      console.log(`No events found for ${eventName}`);
    }
  }, [events, error]);

  if (isLoading) {
    return <CircularProgress size={24} />;
  }

  return null;
};

export default ContractEventListener;
