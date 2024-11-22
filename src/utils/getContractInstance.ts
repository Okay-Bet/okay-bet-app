// utils/getContractInstance.ts
// used to initialize a contract, not currently using contracts but may change soon

import { useReadContract } from "thirdweb/react";
import { contract } from "@/app/client";

export default function Component() {
  const { data, isLoading } = useReadContract({ 
    contract, 
    method: "function getBets() view returns (address[])", 
    params: [] 
  });
}