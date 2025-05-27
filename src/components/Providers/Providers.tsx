import PrivyProvider from "./privyProvider";
import BetSlipProviderWrapper from "./betSlipProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <BetSlipProviderWrapper>
      {children}
    </BetSlipProviderWrapper>
  );
}