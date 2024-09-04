import React, { useState, useEffect } from 'react';
import { useBlockNumber } from "thirdweb/react";
import { defineChain } from "thirdweb/chains";
import { client } from "@/app/client";



interface ExpirationTimerProps {
  expirationBlock: number;
}

const ExpirationTimer: React.FC<ExpirationTimerProps> = ({ expirationBlock}) => {
  const blockNumber = useBlockNumber({ client, chain: defineChain(8453) });
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (blockNumber !== undefined) {
      const blocksLeft = expirationBlock - Number(blockNumber);
      const secondsLeft = blocksLeft * 12; // Assuming 12 seconds per block on average
      
      const days = Math.floor(secondsLeft / (3600 * 24));
      const hours = Math.floor((secondsLeft % (3600 * 24)) / 3600);
      const minutes = Math.floor((secondsLeft % 3600) / 60);

      if (days > 0) {
        setTimeLeft(`${days} day${days > 1 ? 's' : ''}`);
      } else if (hours > 0) {
        setTimeLeft(`${hours} hour${hours > 1 ? 's' : ''}`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes} minute${minutes > 1 ? 's' : ''}`);
      } else if (secondsLeft > 0) {
        setTimeLeft('Less than a minute');
      } else {
        setTimeLeft('Expired');
      }
    }
  }, [blockNumber, expirationBlock]);

  return <span>{timeLeft}</span>;
};

export default ExpirationTimer;