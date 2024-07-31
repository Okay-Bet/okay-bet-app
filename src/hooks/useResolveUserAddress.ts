// hooks/useResolveUserAddress.ts
import { client } from "@/app/client";
import { resolveAddress, resolveName } from "thirdweb/extensions/ens";
import { ethers } from "ethers";
import UsernameRegistryABI from "@/constants/UsernameRegistryABI.json";

const UsernameRegistryAddress = "0x93e7E62ffEBc3FD586EEf177Fc094225868c7Df4";

export const resolveUserAddress = async (identifier: string): Promise<{ address: string | null; displayName: string }> => {
  // Check if it's a valid Ethereum address
  if (ethers.utils.isAddress(identifier)) {
    // Try to get ENS name for the address
    try {
      const ensName = await resolveName({ client, address: identifier });
      if (ensName) {
        return { address: identifier, displayName: ensName };
      }
    } catch (error) {
      console.error("Error looking up ENS name:", error);
    }

    // Try to get username for the address
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(UsernameRegistryAddress, UsernameRegistryABI, provider);
      const username = await contract.getUsernameByAddress(identifier);
      if (username) {
        return { address: identifier, displayName: username };
      }
    } catch (error) {
      console.error("Error getting username:", error);
    }

    return { address: identifier, displayName: identifier };
  }

  // Try to resolve as ENS
  try {
    const address = await resolveAddress({ client, name: identifier });
    if (address) return { address, displayName: identifier };
  } catch (error) {
    console.error("Error resolving ENS:", error);
  }

  // Try to resolve as username
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(UsernameRegistryAddress, UsernameRegistryABI, provider);
    const address = await contract.getAddressByUsername(identifier);
    if (address !== ethers.constants.AddressZero) {
      return { address, displayName: identifier };
    }
  } catch (error) {
    console.error("Error resolving username:", error);
  }

  return { address: null, displayName: identifier };
};