// hooks/useValidateAddress.ts
import { useState, useEffect } from "react";
import resolveUserAddress from "@/utils/resolveUserAddress";

export const useValidateAddress = (identifier: string, type: string) => {
  const [isValid, setIsValid] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!identifier) {
      setIsValid(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const validate = async () => {
      try {
        const resolvedAddress = await resolveUserAddress(identifier, type);
        setIsValid(!!resolvedAddress);
      } catch (error) {
        setIsValid(false);
      } finally {
        setIsLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      validate();
    }, 2000);

    return () => clearTimeout(delayDebounceFn);
  }, [identifier, type]);

  return { isValid, isLoading };
};
