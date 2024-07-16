"use client";

import React, { useEffect, useState } from 'react';
import { useReadContract } from "thirdweb/react";

interface BetDetailsProps {
    contract: any;
  }

const BetDetails: React.FC<BetDetailsProps> = ({ contract }) => {
    const { data, isLoading } = useReadContract({
    contract,
    method: "function bet() view returns (address better1, address better2, address decider, uint256 wager, string conditions, uint8 status, address winner)",
    params: []
  });

  return (
    <div>
      <h3>Bet Details</h3>
      {isLoading ? (
        <p>Loading bet details...</p>
      ) : (
        <div>
          {data && (
            <ul>
              <li>Bettor 1: {data[0]}</li>
              <li>Bettor 2: {data[1]}</li>
              <li>Judge: {data[2]}</li>
              <li>Wager: {data[3].toString()}</li>
              <li>Conditions: {data[4]}</li>
              <li>Status: {data[5]}</li>
              <li>Winner: {data[6]}</li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default BetDetails;
