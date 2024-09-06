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
  address: "0x50EB806Cbf052c4AD4D4862d36991769fBE397De" 
});
