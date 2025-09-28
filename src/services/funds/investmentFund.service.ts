import { 
  createPublicClient, 
  createWalletClient, 
  http, 
  parseUnits,
  formatUnits,
  type PublicClient,
  type WalletClient,
  type Address
} from 'viem';
import { polygonAmoy } from '@/lib/viem';
import { INVESTMENT_FUND_ABI } from '@/constants/investmentFundABI';
import { 
  Fund, 
  FundPhase,
  FundMetrics,
  UserPosition,
  USDC_DECIMALS,
  MIN_INVESTMENT_USDC,
  usdcToWei,
  weiToUsdc
} from './types';

// USDC ABI for approval
const USDC_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "spender", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "address", "name": "spender", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export class InvestmentFundService {
  public publicClient: PublicClient;
  private usdcAddress: Address;

  constructor() {
    this.usdcAddress = (process.env.NEXT_PUBLIC_USDC_ADDRESS_AMOY || 
      '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582') as Address;

    this.publicClient = createPublicClient({
      chain: polygonAmoy,
      transport: http(process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC || 'https://rpc-amoy.polygon.technology')
    });
  }

  // Get current phase of the fund
  async getCurrentPhase(fundAddress: Address): Promise<FundPhase> {
    try {
      const phase = await this.publicClient.readContract({
        address: fundAddress,
        abi: INVESTMENT_FUND_ABI,
        functionName: 'getCurrentPhase'
      }) as number;

      return phase as FundPhase;
    } catch (error) {
      console.error('Error fetching fund phase:', error);
      throw error;
    }
  }

  // Get fund metrics
  async getFundMetrics(fundAddress: Address): Promise<FundMetrics> {
    try {
      // First get the required fields
      const [
        totalDeposits,
        targetRaise,
        currentPhase,
        depositDeadline,
        totalSupply
      ] = await Promise.all([
        this.publicClient.readContract({
          address: fundAddress,
          abi: INVESTMENT_FUND_ABI,
          functionName: 'totalDeposits'
        }) as Promise<bigint>,
        this.publicClient.readContract({
          address: fundAddress,
          abi: INVESTMENT_FUND_ABI,
          functionName: 'targetRaise'
        }) as Promise<bigint>,
        this.publicClient.readContract({
          address: fundAddress,
          abi: INVESTMENT_FUND_ABI,
          functionName: 'getCurrentPhase'
        }) as Promise<number>,
        this.publicClient.readContract({
          address: fundAddress,
          abi: INVESTMENT_FUND_ABI,
          functionName: 'depositDeadline'
        }) as Promise<bigint>,
        this.publicClient.readContract({
          address: fundAddress,
          abi: INVESTMENT_FUND_ABI,
          functionName: 'totalSupply'
        }) as Promise<bigint>
      ]);

      // Try to get tradingEndTime separately (it might not exist on all contracts)
      let tradingEndTime: bigint | undefined;
      try {
        tradingEndTime = await this.publicClient.readContract({
          address: fundAddress,
          abi: INVESTMENT_FUND_ABI,
          functionName: 'tradingEndTime'
        }) as bigint;
      } catch (err) {
        // tradingEndTime not available on this contract version
        tradingEndTime = undefined;
      }

      const progressPercentage = targetRaise > 0n 
        ? Number((totalDeposits * 100n) / targetRaise)
        : 0;

      return {
        totalDeposits,
        targetRaise,
        progressPercentage,
        currentPhase: currentPhase as FundPhase,
        depositDeadline: new Date(Number(depositDeadline) * 1000),
        tradingEndTime: tradingEndTime && tradingEndTime > 0n ? new Date(Number(tradingEndTime) * 1000) : undefined,
        totalSupply
      };
    } catch (error) {
      console.error('Error fetching fund metrics:', error);
      throw error;
    }
  }

  // Get user's share balance
  async getShareBalance(fundAddress: Address, userAddress: Address): Promise<bigint> {
    try {
      const balance = await this.publicClient.readContract({
        address: fundAddress,
        abi: INVESTMENT_FUND_ABI,
        functionName: 'balanceOf',
        args: [userAddress]
      }) as bigint;

      return balance;
    } catch (error) {
      console.error('Error fetching share balance:', error);
      throw error;
    }
  }

  // Get user's USDC balance
  async getUsdcBalance(userAddress: Address): Promise<bigint> {
    try {
      const balance = await this.publicClient.readContract({
        address: this.usdcAddress,
        abi: USDC_ABI,
        functionName: 'balanceOf',
        args: [userAddress]
      }) as bigint;

      return balance;
    } catch (error) {
      console.error('Error fetching USDC balance:', error);
      throw error;
    }
  }

  // Check USDC allowance
  async checkAllowance(
    ownerAddress: Address, 
    spenderAddress: Address
  ): Promise<bigint> {
    try {
      const allowance = await this.publicClient.readContract({
        address: this.usdcAddress,
        abi: USDC_ABI,
        functionName: 'allowance',
        args: [ownerAddress, spenderAddress]
      }) as bigint;

      return allowance;
    } catch (error) {
      console.error('Error checking allowance:', error);
      throw error;
    }
  }

  // Approve USDC spending
  async approveUsdc(
    fundAddress: Address,
    amount: bigint,
    walletClient: WalletClient
  ): Promise<string> {
    const account = walletClient.account;
    if (!account) throw new Error('Wallet not connected');

    try {
      const { request } = await this.publicClient.simulateContract({
        address: this.usdcAddress,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [fundAddress, amount],
        account: account.address
      });

      const hash = await walletClient.writeContract(request);
      await this.publicClient.waitForTransactionReceipt({ hash });
      
      return hash;
    } catch (error) {
      console.error('Error approving USDC:', error);
      throw error;
    }
  }

  // Deposit USDC into fund
  async deposit(
    fundAddress: Address,
    amountUsdc: number,
    walletClient: WalletClient
  ): Promise<{ hash: string; shares?: bigint }> {
    const account = walletClient.account;
    if (!account) throw new Error('Wallet not connected');

    if (amountUsdc < MIN_INVESTMENT_USDC) {
      throw new Error(`Minimum investment is ${MIN_INVESTMENT_USDC} USDC`);
    }

    const amount = usdcToWei(amountUsdc);

    try {
      // Check USDC balance
      const balance = await this.getUsdcBalance(account.address);
      if (balance < amount) {
        throw new Error('Insufficient USDC balance');
      }

      // Check and approve if needed
      const allowance = await this.checkAllowance(account.address, fundAddress);
      if (allowance < amount) {
        await this.approveUsdc(fundAddress, amount, walletClient);
      }

      // Deposit
      const { request } = await this.publicClient.simulateContract({
        address: fundAddress,
        abi: INVESTMENT_FUND_ABI,
        functionName: 'deposit',
        args: [amount],
        account: account.address
      });

      const hash = await walletClient.writeContract(request);
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      // Parse Deposit event to get shares issued
      const depositEvent = receipt.logs.find(
        log => log.topics[0] === '0x' // Add actual Deposit event signature
      );

      let shares: bigint | undefined;
      if (depositEvent && depositEvent.data) {
        // Parse shares from event data
        // shares = ...
      }

      return { hash, shares };
    } catch (error) {
      console.error('Error depositing to fund:', error);
      throw error;
    }
  }

  // Withdraw from fund (redeem shares)
  async withdraw(
    fundAddress: Address,
    walletClient: WalletClient
  ): Promise<string> {
    const account = walletClient.account;
    if (!account) throw new Error('Wallet not connected');

    try {
      // Check current phase
      const phase = await this.getCurrentPhase(fundAddress);
      if (phase !== FundPhase.REDEMPTION) {
        throw new Error('Fund is not in redemption phase');
      }

      const { request } = await this.publicClient.simulateContract({
        address: fundAddress,
        abi: INVESTMENT_FUND_ABI,
        functionName: 'withdraw',
        account: account.address
      });

      const hash = await walletClient.writeContract(request);
      await this.publicClient.waitForTransactionReceipt({ hash });
      
      return hash;
    } catch (error) {
      console.error('Error withdrawing from fund:', error);
      throw error;
    }
  }

  // Get user position
  async getUserPosition(
    fundAddress: Address, 
    userAddress: Address
  ): Promise<UserPosition> {
    try {
      const [shares, depositAmount] = await Promise.all([
        this.getShareBalance(fundAddress, userAddress),
        this.publicClient.readContract({
          address: fundAddress,
          abi: INVESTMENT_FUND_ABI,
          functionName: 'userDeposits',
          args: [userAddress]
        }) as Promise<bigint>
      ]);

      // Calculate current value if in redemption phase
      let currentValue: bigint | undefined;
      let profit: bigint | undefined;

      const phase = await this.getCurrentPhase(fundAddress);
      if (phase === FundPhase.REDEMPTION || phase === FundPhase.COMPLETED) {
        const [finalFundValue, totalDeposits, totalSupply] = await Promise.all([
          this.publicClient.readContract({
            address: fundAddress,
            abi: INVESTMENT_FUND_ABI,
            functionName: 'finalFundValue'
          }) as Promise<bigint>,
          this.publicClient.readContract({
            address: fundAddress,
            abi: INVESTMENT_FUND_ABI,
            functionName: 'totalDeposits'
          }) as Promise<bigint>,
          this.publicClient.readContract({
            address: fundAddress,
            abi: INVESTMENT_FUND_ABI,
            functionName: 'totalSupply'
          }) as Promise<bigint>
        ]);

        if (totalSupply > 0n) {
          currentValue = (shares * finalFundValue) / totalSupply;
          profit = currentValue > depositAmount ? currentValue - depositAmount : 0n;
        }
      }

      return {
        fundAddress,
        shares,
        depositAmount,
        currentValue,
        profit
      };
    } catch (error) {
      console.error('Error fetching user position:', error);
      throw error;
    }
  }

  // Start trading (manager only)
  async startTrading(
    fundAddress: Address,
    walletClient: WalletClient
  ): Promise<string> {
    const account = walletClient.account;
    if (!account) throw new Error('Wallet not connected');

    try {
      const { request } = await this.publicClient.simulateContract({
        address: fundAddress,
        abi: INVESTMENT_FUND_ABI,
        functionName: 'startTrading',
        account: account.address
      });

      const hash = await walletClient.writeContract(request);
      await this.publicClient.waitForTransactionReceipt({ hash });
      
      return hash;
    } catch (error) {
      console.error('Error starting trading:', error);
      throw error;
    }
  }

  // Return funds (agent only)
  async returnFunds(
    fundAddress: Address,
    amount: bigint,
    walletClient: WalletClient
  ): Promise<string> {
    const account = walletClient.account;
    if (!account) throw new Error('Wallet not connected');

    try {
      const { request } = await this.publicClient.simulateContract({
        address: fundAddress,
        abi: INVESTMENT_FUND_ABI,
        functionName: 'returnFunds',
        args: [amount],
        account: account.address
      });

      const hash = await walletClient.writeContract(request);
      await this.publicClient.waitForTransactionReceipt({ hash });
      
      return hash;
    } catch (error) {
      console.error('Error returning funds:', error);
      throw error;
    }
  }
}