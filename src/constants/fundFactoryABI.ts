export const FUND_FACTORY_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "_usdc", "type": "address" }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "fund", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "manager", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "agent", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "fundName", "type": "string" },
      { "indexed": false, "internalType": "uint256", "name": "targetRaise", "type": "uint256" }
    ],
    "name": "FundCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "agent", "type": "address" },
      { "indexed": false, "internalType": "bool", "name": "status", "type": "bool" }
    ],
    "name": "AgentWhitelisted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "uint256", "name": "newFee", "type": "uint256" }
    ],
    "name": "ProtocolFeeUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "fund", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "ProtocolFeeCollected",
    "type": "event"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "fundName", "type": "string" },
      { "internalType": "address", "name": "agentWallet", "type": "address" },
      { "internalType": "uint256", "name": "targetRaise", "type": "uint256" },
      { "internalType": "uint256", "name": "tradingDuration", "type": "uint256" },
      { "internalType": "uint256", "name": "entryFee", "type": "uint256" },
      { "internalType": "uint256", "name": "carriedInterest", "type": "uint256" },
      { "internalType": "uint256", "name": "minInvestment", "type": "uint256" },
      { "internalType": "uint256", "name": "depositDeadline", "type": "uint256" }
    ],
    "name": "createFund",
    "outputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "agent", "type": "address" },
      { "internalType": "bool", "name": "status", "type": "bool" }
    ],
    "name": "whitelistAgent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address[]", "name": "agents", "type": "address[]" },
      { "internalType": "bool[]", "name": "statuses", "type": "bool[]" }
    ],
    "name": "batchWhitelistAgents",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "newFee", "type": "uint256" }
    ],
    "name": "setProtocolFee",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "fund", "type": "address" }
    ],
    "name": "collectProtocolFee",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "unpause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllFunds",
    "outputs": [
      { "internalType": "address[]", "name": "", "type": "address[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "manager", "type": "address" }
    ],
    "name": "getManagerFunds",
    "outputs": [
      { "internalType": "address[]", "name": "", "type": "address[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "agent", "type": "address" }
    ],
    "name": "getAgentFunds",
    "outputs": [
      { "internalType": "address[]", "name": "", "type": "address[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getFundCount",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "fund", "type": "address" }
    ],
    "name": "getFundDetails",
    "outputs": [
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "address", "name": "manager", "type": "address" },
      { "internalType": "address", "name": "agent", "type": "address" },
      { "internalType": "uint256", "name": "targetRaise", "type": "uint256" },
      { "internalType": "uint256", "name": "minInvestment", "type": "uint256" },
      { "internalType": "uint256", "name": "entryFee", "type": "uint256" },
      { "internalType": "uint256", "name": "carriedInterest", "type": "uint256" },
      { "internalType": "uint256", "name": "depositDeadline", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "usdc",
    "outputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "protocolFee",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_PROTOCOL_FEE",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "name": "whitelistedAgents",
    "outputs": [
      { "internalType": "bool", "name": "", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "", "type": "address" },
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "name": "managerFunds",
    "outputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "", "type": "address" },
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "name": "agentFunds",
    "outputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "name": "allFunds",
    "outputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;