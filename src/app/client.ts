import { createThirdwebClient, getContract, resolveMethod } from "thirdweb";
import { defineChain } from "thirdweb/chains";

const clientId =  process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID

if (!clientId) {
  throw new Error("No client ID provided");
}

export const client = createThirdwebClient({
  clientId: clientId,
});

// connect to your contract
export const contract = getContract({ 
  client, 
  chain: defineChain(8453), 
  address: "0x417dEf0b502FeC1D1E187821B6a86920e25239d8" 
});
