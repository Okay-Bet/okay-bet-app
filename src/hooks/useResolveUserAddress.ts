// hooks/useResolveUserAddress.ts
import { client } from "@/app/client";
import { resolveAddress } from "thirdweb/extensions/ens";
import { getUserWalletAddressByEmail, getUserWalletAddressByPhone } from "@/services/userService";

export const resolveUserAddress = async (identifier: string, type: string) => {
  if (type === "wallet") {
    const address = await resolveAddress({ client, name: identifier });
    return address;
  } else if (type === "email") {
    const address = await getUserWalletAddressByEmail(identifier);
    return address;
  } else if (type === "phone") {
    const address = await getUserWalletAddressByPhone(identifier);
    return address;
  } else {
    throw new Error("Invalid identifier type");
  }
};
