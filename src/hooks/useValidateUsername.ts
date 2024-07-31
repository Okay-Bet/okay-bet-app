// hooks/useValidateUsername.ts
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import UsernameRegistryABI from "@/constants/UsernameRegistryABI.json";

const UsernameRegistryAddress = "0x93e7E62ffEBc3FD586EEf177Fc094225868c7Df4";

export const useValidateUsername = (username: string) => {
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);

  useEffect(() => {
    const validateUsername = async () => {
      if (!username) {
        setIsValid(false);
        setResolvedAddress(null);
        return;
      }

      setIsLoading(true);
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const contract = new ethers.Contract(UsernameRegistryAddress, UsernameRegistryABI, provider);
        const address = await contract.getAddressByUsername(username);
        
        if (address !== ethers.constants.AddressZero) {
          setIsValid(true);
          setResolvedAddress(address);
        } else {
          setIsValid(false);
          setResolvedAddress(null);
        }
      } catch (error) {
        console.error("Error validating username:", error);
        setIsValid(false);
        setResolvedAddress(null);
      } finally {
        setIsLoading(false);
      }
    };

    validateUsername();
  }, [username]);

  return { isValid, isLoading, resolvedAddress };
};