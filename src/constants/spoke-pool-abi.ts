// src/constants/spoke-pool-abi.ts

export const SPOKE_POOL_ABI = [
  // Custom Errors - These are crucial for error handling
  {
    inputs: [],
    name: "ClaimedMerkleLeaf",
    type: "error"
  },
  {
    inputs: [],
    name: "DepositsArePaused",
    type: "error"
  },
  {
    inputs: [],
    name: "DisabledRoute",
    type: "error"
  },
  {
    inputs: [],
    name: "ExpiredFillDeadline",
    type: "error"
  },
  {
    inputs: [],
    name: "FillsArePaused",
    type: "error"
  },
  {
    inputs: [],
    name: "InvalidChainId",
    type: "error"
  },
  {
    inputs: [],
    name: "InvalidCrossDomainAdmin",
    type: "error"
  },
  {
    inputs: [],
    name: "InvalidDepositorSignature",
    type: "error"
  },
  {
    inputs: [],
    name: "InvalidExclusiveRelayer",
    type: "error"
  },
  {
    inputs: [],
    name: "InvalidExclusivityDeadline",
    type: "error"
  },
  {
    inputs: [],
    name: "InvalidFillDeadline",
    type: "error"
  },
  {
    inputs: [],
    name: "InvalidHubPool",
    type: "error"
  },
  {
    inputs: [],
    name: "InvalidPayoutAdjustmentPct",
    type: "error"
  },
  {
    inputs: [],
    name: "InvalidQuoteTimestamp",
    type: "error"
  },
  {
    inputs: [],
    name: "InvalidRelayerFeePct",
    type: "error"
  },
  {
    inputs: [],
    name: "InvalidSlowFillRequest",
    type: "error"
  },
  {
    inputs: [],
    name: "MaxTransferSizeExceeded",
    type: "error"
  },
  {
    inputs: [],
    name: "MsgValueDoesNotMatchInputAmount",
    type: "error"
  },
  {
    inputs: [],
    name: "NoSlowFillsInExclusivityWindow",
    type: "error"
  },
  {
    inputs: [],
    name: "NotCrossChainCall",
    type: "error"
  },
  {
    inputs: [],
    name: "NotCrossDomainAdmin",
    type: "error"
  },
  {
    inputs: [],
    name: "NotEOA",
    type: "error"
  },
  {
    inputs: [],
    name: "NotExclusiveRelayer",
    type: "error"
  },
  {
    inputs: [],
    name: "RelayFilled",
    type: "error"
  },

  // Constructor
  {
    inputs: [
      {
        internalType: "address",
        name: "_wrappedNativeTokenAddress",
        type: "address",
      },
      {
        internalType: "uint32",
        name: "_depositQuoteTimeBuffer",
        type: "uint32",
      },
      {
        internalType: "uint32",
        name: "_fillDeadlineBuffer",
        type: "uint32",
      },
      {
        internalType: "contract IERC20",
        name: "_l2Usdc",
        type: "address",
      },
      {
        internalType: "contract ITokenMessenger",
        name: "_cctpTokenMessenger",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },

  // Deposit V3 function that we need
  {
    inputs: [
      {
        internalType: "address",
        name: "depositor",
        type: "address",
      },
      {
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        internalType: "address",
        name: "inputToken",
        type: "address",
      },
      {
        internalType: "address",
        name: "outputToken",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "inputAmount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "outputAmount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "destinationChainId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "exclusiveRelayer",
        type: "address",
      },
      {
        internalType: "uint32",
        name: "quoteTimestamp",
        type: "uint32",
      },
      {
        internalType: "uint32",
        name: "fillDeadline",
        type: "uint32",
      },
      {
        internalType: "uint32",
        name: "exclusivityPeriod",
        type: "uint32",
      },
      {
        internalType: "bytes",
        name: "message",
        type: "bytes",
      },
    ],
    name: "depositV3",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },

  // Events we need
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "inputToken",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "outputToken",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "inputAmount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "outputAmount",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "destinationChainId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "uint32",
        name: "depositId",
        type: "uint32",
      },
      {
        indexed: false,
        internalType: "uint32",
        name: "quoteTimestamp",
        type: "uint32",
      },
      {
        indexed: false,
        internalType: "uint32",
        name: "fillDeadline",
        type: "uint32",
      },
      {
        indexed: false,
        internalType: "uint32",
        name: "exclusivityDeadline",
        type: "uint32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "depositor",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "exclusiveRelayer",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "message",
        type: "bytes",
      },
    ],
    name: "V3FundsDeposited",
    type: "event",
  },
] as const;
