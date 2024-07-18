import { resolveAddress } from "thirdweb/extensions/ens";
import { client } from "@/app/client";
import { getUserWalletAddressByEmail, getUserWalletAddressByPhone } from "@/services/userService"; // Import your service functions

/**
 * Resolves a user's wallet address from an email, phone number, wallet address, or ENS address.
 * @param input - The input to resolve (email, phone, wallet address, or ENS address).
 * @returns The resolved wallet address.
 */
export const resolveUserAddress = async (input: string): Promise<string> => {
  // Check if the input is an email
  if (input.includes("@")) {
    const emailResolvedAddress = await getUserWalletAddressByEmail(input);
    if (emailResolvedAddress) {
      return emailResolvedAddress;
    }
  }

  // Check if the input is a phone number
  if (/^\+?[1-9]\d{1,14}$/.test(input)) {
    const phoneResolvedAddress = await getUserWalletAddressByPhone(input);
    if (phoneResolvedAddress) {
      return phoneResolvedAddress;
    }
  }

  // Try resolving as ENS address or wallet address
  try {
    const ensResolvedAddress = await resolveAddress({ client, name: input });
    return ensResolvedAddress || input;
  } catch {
    return input;
  }
};
