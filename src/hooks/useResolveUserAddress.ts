import { client } from "@/app/client";
import { resolveAddress, resolveName } from "thirdweb/extensions/ens";
import { ethers } from "ethers";
import UsernameRegistryABI from "@/constants/UsernameRegistryABI.json";

const UsernameRegistryAddress = "0x93e7E62ffEBc3FD586EEf177Fc094225868c7Df4";

export const resolveUserAddress = async (identifier: string): Promise<{ address: string | null; displayName: string }> => {
  const provider = new ethers.providers.JsonRpcProvider(process.env.NEXT_PUBLIC_BASE_MAINNET_RPC);
  const contract = new ethers.Contract(UsernameRegistryAddress, UsernameRegistryABI, provider);

  // Check if it's a valid Ethereum address
  if (ethers.utils.isAddress(identifier)) {
    // Try to get username for the address first
    try {
      const username = await contract.getUsernameByAddress(identifier);
      if (username) {
        return { address: identifier, displayName: username };
      }
    } catch (error) {
      console.error("Error getting username:", error);
    }

    // If no username, try to get ENS name for the address
    try {
      // Ensure the identifier is of the correct type for resolveName
      const formattedAddress = identifier.toLowerCase().startsWith('0x') 
        ? identifier as `0x${string}` 
        : `0x${identifier}` as `0x${string}`;
      
      const ensName = await resolveName({ client, address: formattedAddress });
      if (ensName) {
        return { address: identifier, displayName: ensName };
      }
    } catch (error) {
      console.error("Error looking up ENS name:", error);
    }

    // If no username or ENS, return the address itself
    return { address: identifier, displayName: identifier };
  }

  // Try to resolve as username first
  try {
    const address = await contract.getAddressByUsername(identifier);
    if (address !== ethers.constants.AddressZero) {
      return { address, displayName: identifier };
    }
  } catch (error) {
    console.error("Error resolving username:", error);
  }

  // If not a username, try to resolve as ENS
  try {
    const address = await resolveAddress({ client, name: identifier });
    if (address) return { address, displayName: identifier };
  } catch (error) {
    console.error("Error resolving ENS:", error);
  }

  // If all else fails, return null address and the original identifier
  return { address: null, displayName: identifier };
};