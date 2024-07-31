// hooks/useResolveUserAddress.ts
import { client } from "@/app/client";
import { resolveAddress } from "thirdweb/extensions/ens";
import { ethers } from "ethers";
import UsernameRegistryABI from "@/constants/UsernameRegistryABI.json";

const UsernameRegistryAddress = "0x93e7E62ffEBc3FD586EEf177Fc094225868c7Df4";

export const resolveUserAddress = async (identifier: string): Promise<string | null> => {
  // Check if it's a valid Ethereum address
  if (ethers.utils.isAddress(identifier)) {
    return identifier;
  }

  // Try to resolve as ENS
  try {
    const address = await resolveAddress({ client, name: identifier });
    if (address) return address;
  } catch (error) {
    console.error("Error resolving ENS:", error);
  }

  // Try to resolve as username
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(UsernameRegistryAddress, UsernameRegistryABI, provider);
    const address = await contract.getAddressByUsername(identifier);
    if (address !== ethers.constants.AddressZero) {
      return address;
    }
  } catch (error) {
    console.error("Error resolving username:", error);
  }

  return null;
};