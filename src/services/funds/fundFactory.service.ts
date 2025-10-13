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
import { FUND_FACTORY_ABI } from '@/constants/fundFactoryABI';
import { 
  Fund, 
  CreateFundParams, 
  FundFactoryConfig,
  USDC_DECIMALS,
  MIN_INVESTMENT_USDC,
  MIN_TARGET_RAISE_USDC,
  MAX_ENTRY_FEE_BP,
  MAX_CARRIED_INTEREST_BP,
  MIN_TRADING_DURATION,
  MAX_TRADING_DURATION
} from './types';

export class FundFactoryService {
  private publicClient: PublicClient;
  private factoryAddress: Address;
  private usdcAddress: Address;

  constructor(config?: Partial<FundFactoryConfig>) {
    this.factoryAddress = (config?.factoryAddress || 
      process.env.NEXT_PUBLIC_FUND_FACTORY_ADDRESS || 
      '0x5eA0B0b61A99c1AbAB3235fd1c358dEaFe426900') as Address;
    
    this.usdcAddress = (config?.usdcAddress || 
      process.env.NEXT_PUBLIC_USDC_ADDRESS_AMOY || 
      '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582') as Address;

    this.publicClient = createPublicClient({
      chain: polygonAmoy,
      transport: http(config?.rpcUrl || process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC || 'https://rpc-amoy.polygon.technology')
    });
  }

  // Validate fund creation parameters
  private validateCreateParams(params: CreateFundParams): void {
    const targetRaiseUsdc = Number(params.targetRaise) / 10 ** USDC_DECIMALS;
    const minInvestmentUsdc = Number(params.minInvestment) / 10 ** USDC_DECIMALS;

    if (minInvestmentUsdc < MIN_INVESTMENT_USDC) {
      throw new Error(`Minimum investment must be at least ${MIN_INVESTMENT_USDC} USDC`);
    }

    if (targetRaiseUsdc < MIN_TARGET_RAISE_USDC) {
      throw new Error(`Target raise must be at least ${MIN_TARGET_RAISE_USDC} USDC`);
    }

    if (params.entryFee > MAX_ENTRY_FEE_BP) {
      throw new Error(`Entry fee cannot exceed ${MAX_ENTRY_FEE_BP / 100}%`);
    }

    if (params.carriedInterest > MAX_CARRIED_INTEREST_BP) {
      throw new Error(`Carried interest cannot exceed ${MAX_CARRIED_INTEREST_BP / 100}%`);
    }

    if (params.tradingDuration < MIN_TRADING_DURATION) {
      throw new Error('Trading duration must be at least 1 day');
    }

    if (params.tradingDuration > MAX_TRADING_DURATION) {
      throw new Error('Trading duration cannot exceed 365 days');
    }

    if (params.depositDeadline <= Date.now() / 1000) {
      throw new Error('Deposit deadline must be in the future');
    }
  }

  // Create a new fund
  async createFund(
    params: CreateFundParams,
    walletClient: WalletClient
  ): Promise<{ hash: string; fundAddress?: string }> {
    this.validateCreateParams(params);

    const account = walletClient.account;
    if (!account) throw new Error('Wallet not connected');

    try {
      const { request } = await this.publicClient.simulateContract({
        address: this.factoryAddress,
        abi: FUND_FACTORY_ABI,
        functionName: 'createFund',
        args: [
          params.fundName,
          params.agentWallet as Address,
          params.targetRaise,
          BigInt(params.tradingDuration),
          BigInt(params.entryFee),
          BigInt(params.carriedInterest),
          params.minInvestment,
          BigInt(params.depositDeadline)
        ],
        account: account.address
      });

      const hash = await walletClient.writeContract(request);

      // Wait for transaction and get fund address from event
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
      
      // Parse FundCreated event to get new fund address
      const fundCreatedEvent = receipt.logs.find(
        log => log.topics[0] === '0x' // Add actual event signature here
      );

      let fundAddress: string | undefined;
      if (fundCreatedEvent && fundCreatedEvent.topics[1]) {
        fundAddress = `0x${fundCreatedEvent.topics[1].slice(26)}`;
      }

      return { hash, fundAddress };
    } catch (error) {
      console.error('Error creating fund:', error);
      throw error;
    }
  }

  // Get all funds
  async getAllFunds(): Promise<Address[]> {
    try {
      const funds = await this.publicClient.readContract({
        address: this.factoryAddress,
        abi: FUND_FACTORY_ABI,
        functionName: 'getAllFunds'
      }) as Address[];

      return funds;
    } catch (error) {
      console.error('Error fetching all funds:', error);
      throw error;
    }
  }

  // Get funds by manager
  async getManagerFunds(managerAddress: Address): Promise<Address[]> {
    try {
      const funds = await this.publicClient.readContract({
        address: this.factoryAddress,
        abi: FUND_FACTORY_ABI,
        functionName: 'getManagerFunds',
        args: [managerAddress]
      }) as Address[];

      return funds;
    } catch (error) {
      console.error('Error fetching manager funds:', error);
      throw error;
    }
  }

  // Get funds by agent
  async getAgentFunds(agentAddress: Address): Promise<Address[]> {
    try {
      const funds = await this.publicClient.readContract({
        address: this.factoryAddress,
        abi: FUND_FACTORY_ABI,
        functionName: 'getAgentFunds',
        args: [agentAddress]
      }) as Address[];

      return funds;
    } catch (error) {
      console.error('Error fetching agent funds:', error);
      throw error;
    }
  }

  // Get fund details
  async getFundDetails(fundAddress: Address): Promise<Partial<Fund>> {
    try {
      const details = await this.publicClient.readContract({
        address: this.factoryAddress,
        abi: FUND_FACTORY_ABI,
        functionName: 'getFundDetails',
        args: [fundAddress]
      }) as any;

      return {
        address: fundAddress,
        name: details[0],
        manager: details[1],
        agent: details[2],
        targetRaise: details[3],
        minInvestment: details[4],
        entryFee: Number(details[5]),
        carriedInterest: Number(details[6]),
        depositDeadline: new Date(Number(details[7]) * 1000)
      };
    } catch (error) {
      console.error('Error fetching fund details:', error);
      throw error;
    }
  }

  // Check if agent is whitelisted
  async isAgentWhitelisted(agentAddress: Address): Promise<boolean> {
    try {
      const isWhitelisted = await this.publicClient.readContract({
        address: this.factoryAddress,
        abi: FUND_FACTORY_ABI,
        functionName: 'whitelistedAgents',
        args: [agentAddress]
      }) as boolean;

      return isWhitelisted;
    } catch (error) {
      console.error('Error checking agent whitelist:', error);
      throw error;
    }
  }

  // Whitelist an agent (only owner can call this)
  async whitelistAgent(
    agentAddress: Address,
    status: boolean,
    walletClient: WalletClient
  ): Promise<string> {
    const account = walletClient.account;
    if (!account) throw new Error('Wallet not connected');

    try {
      const { request } = await this.publicClient.simulateContract({
        address: this.factoryAddress,
        abi: FUND_FACTORY_ABI,
        functionName: 'whitelistAgent',
        args: [agentAddress, status],
        account
      });

      const hash = await walletClient.writeContract(request);
      return hash;
    } catch (error: any) {
      console.error('Error whitelisting agent:', error);
      throw new Error(error.message || 'Failed to whitelist agent');
    }
  }

  // Get contract owner
  async getOwner(): Promise<Address> {
    try {
      const owner = await this.publicClient.readContract({
        address: this.factoryAddress,
        abi: FUND_FACTORY_ABI,
        functionName: 'owner'
      }) as Address;

      return owner;
    } catch (error) {
      console.error('Error fetching owner:', error);
      throw error;
    }
  }

  // Get protocol fee
  async getProtocolFee(): Promise<number> {
    try {
      const fee = await this.publicClient.readContract({
        address: this.factoryAddress,
        abi: FUND_FACTORY_ABI,
        functionName: 'protocolFee'
      }) as bigint;

      return Number(fee);
    } catch (error) {
      console.error('Error fetching protocol fee:', error);
      throw error;
    }
  }

  // Get total fund count
  async getFundCount(): Promise<number> {
    try {
      const count = await this.publicClient.readContract({
        address: this.factoryAddress,
        abi: FUND_FACTORY_ABI,
        functionName: 'getFundCount'
      }) as bigint;

      return Number(count);
    } catch (error) {
      console.error('Error fetching fund count:', error);
      throw error;
    }
  }
}