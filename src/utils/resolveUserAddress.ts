// utils/resolveUserAddress.ts

import { resolveAddress } from "thirdweb/extensions/ens";
import { client } from "@/app/client";
import { getUserWalletAddressByEmail, getUserWalletAddressByPhone } from "@/services/userService";

/**
 * Resolves a user's wallet address from an email, phone number, wallet address, or ENS address.
 * @param input - The input to resolve (email, phone, wallet address, or ENS address).
 * @param type - The type of input (email, phone, wallet, ens).
 * @returns The resolved wallet address.
 */
const resolveUserAddress = async (input: string, type: string): Promise<string> => {
  if (type === "email") {
    const emailResolvedAddress = await getUserWalletAddressByEmail(input);
    if (emailResolvedAddress) {
      return emailResolvedAddress;
    }
  }

  if (type === "phone") {
    const phoneResolvedAddress = await getUserWalletAddressByPhone(input);
    if (phoneResolvedAddress) {
      return phoneResolvedAddress;
    }
  }

  if (type === "wallet" || type === "ens") {
    const ensResolvedAddress = await resolveAddress({ client, name: input });
    return ensResolvedAddress || input;
  }

  throw new Error("Invalid identifier type");
};

export default resolveUserAddress;
