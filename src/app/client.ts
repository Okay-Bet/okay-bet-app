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
  address: "0xA32DbbA5427fEE87D3CC6CbF85Cd42A75E2F413C" 
});
