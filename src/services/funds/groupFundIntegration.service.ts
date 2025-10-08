import { spmcClient } from '@/services/spmc/client';
import { SPMCGroup, SPMCGroupMarket } from '@/services/spmc/types';
import { CreateFundParams, weiToUsdc, USDC_DECIMALS } from './types';

export interface FundDeployment {
  contract_address: string;
  deployed_at: string;
  chain_id: number;
  factory_address: string;
  status: 'deployed' | 'deposit' | 'trading' | 'redemption' | 'completed';
  tx_hash?: string;
  parameters: {
    target_raise: string; // USDC in wei as string
    trading_duration: number; // seconds
    entry_fee: number; // basis points
    carried_interest: number; // basis points
    min_investment: string; // USDC in wei as string
    deposit_deadline: number; // unix timestamp
    agent_wallet: string;
  };
}

export interface TradingInstruction {
  market_id: string;
  platform: string;
  market_title?: string;
  weight: number;
  allocation_usdc: number;
  allocation_percentage: number;
  outcome: 'yes' | 'no' | 'both';
  market_url?: string;
}

export interface GroupFundMetadata {
  fund_deployment?: FundDeployment;
  trading_instructions?: {
    markets: TradingInstruction[];
    total_allocation: number;
    generated_at: string;
  };
}

export class GroupFundIntegrationService {
  /**
   * Link a deployed fund to a group by storing fund info in group metadata
   */
  async linkFundToGroup(
    groupId: string,
    fundAddress: string,
    deploymentData: {
      txHash: string;
      factoryAddress: string;
      chainId: number;
      params: CreateFundParams;
    }
  ): Promise<void> {
    try {
      // Get current group data
      const groupResponse = await spmcClient.getGroup(groupId);
      if (!groupResponse.success || !groupResponse.data) {
        throw new Error('Failed to fetch group data');
      }

      const group = groupResponse.data;
      const existingMetadata = group.metadata || {};

      // Prepare fund deployment metadata
      const fundDeployment: FundDeployment = {
        contract_address: fundAddress,
        deployed_at: new Date().toISOString(),
        chain_id: deploymentData.chainId,
        factory_address: deploymentData.factoryAddress,
        status: 'deposit',
        tx_hash: deploymentData.txHash,
        parameters: {
          target_raise: deploymentData.params.targetRaise.toString(),
          trading_duration: deploymentData.params.tradingDuration,
          entry_fee: deploymentData.params.entryFee,
          carried_interest: deploymentData.params.carriedInterest,
          min_investment: deploymentData.params.minInvestment.toString(),
          deposit_deadline: deploymentData.params.depositDeadline,
          agent_wallet: deploymentData.params.agentWallet,
        },
      };

      // Generate trading instructions
      const tradingInstructions = await this.generateTradingInstructions(
        group,
        BigInt(deploymentData.params.targetRaise)
      );

      // Update group metadata
      const updatedMetadata: GroupFundMetadata = {
        ...existingMetadata,
        fund_deployment: fundDeployment,
        trading_instructions: tradingInstructions,
      };

      // Save updated metadata to group
      await spmcClient.updateGroup(groupId, {
        metadata: updatedMetadata,
      });

      console.log(`Successfully linked fund ${fundAddress} to group ${groupId}`);
    } catch (error) {
      console.error('Error linking fund to group:', error);
      throw error;
    }
  }

  /**
   * Generate trading instructions from group markets
   */
  async generateTradingInstructions(
    group: SPMCGroup,
    targetRaise: bigint
  ): Promise<{
    markets: TradingInstruction[];
    total_allocation: number;
    generated_at: string;
  }> {
    const markets = group.markets || [];
    const totalWeight = markets.reduce((sum, m) => sum + (m.weight || 1), 0);
    const targetRaiseUsdc = Number(targetRaise) / 10 ** USDC_DECIMALS;

    const instructions: TradingInstruction[] = markets.map((market: SPMCGroupMarket) => {
      const weight = market.weight || 1;
      const allocationPercentage = (weight / totalWeight) * 100;
      const allocationUsdc = (weight / totalWeight) * targetRaiseUsdc;

      return {
        market_id: market.market_id,
        platform: market.market_platform || 'unknown',
        market_title: market.market_title,
        weight: weight,
        allocation_usdc: Math.floor(allocationUsdc),
        allocation_percentage: Math.round(allocationPercentage * 100) / 100,
        outcome: market.outcome || 'yes',
        market_url: this.getMarketUrl(market.market_platform || '', market.market_id),
      };
    });

    return {
      markets: instructions,
      total_allocation: Math.floor(targetRaiseUsdc),
      generated_at: new Date().toISOString(),
    };
  }

  /**
   * Get fund deployment info from group metadata
   */
  async getFundFromGroup(groupId: string): Promise<FundDeployment | null> {
    try {
      const groupResponse = await spmcClient.getGroup(groupId);
      if (!groupResponse.success || !groupResponse.data) {
        return null;
      }

      const metadata = groupResponse.data.metadata as GroupFundMetadata;
      return metadata?.fund_deployment || null;
    } catch (error) {
      console.error('Error fetching fund from group:', error);
      return null;
    }
  }

  /**
   * Update fund status in group metadata
   */
  async updateFundStatus(
    groupId: string,
    status: 'deployed' | 'deposit' | 'trading' | 'redemption' | 'completed',
    additionalData?: {
      tradingStartedAt?: string;
      fundsReturned?: string;
      finalValue?: string;
      profit?: string;
    }
  ): Promise<void> {
    try {
      const groupResponse = await spmcClient.getGroup(groupId);
      if (!groupResponse.success || !groupResponse.data) {
        throw new Error('Failed to fetch group data');
      }

      const metadata = groupResponse.data.metadata as GroupFundMetadata;
      if (!metadata?.fund_deployment) {
        throw new Error('No fund deployment found in group metadata');
      }

      // Update fund status
      metadata.fund_deployment.status = status;

      // Add any additional data
      if (additionalData) {
        metadata.fund_deployment = {
          ...metadata.fund_deployment,
          ...additionalData,
        };
      }

      // Save updated metadata
      await spmcClient.updateGroup(groupId, {
        metadata: metadata,
      });

      console.log(`Updated fund status to ${status} for group ${groupId}`);
    } catch (error) {
      console.error('Error updating fund status:', error);
      throw error;
    }
  }

  /**
   * Get all groups with deployed funds
   */
  async getGroupsWithFunds(): Promise<Array<{ group: SPMCGroup; fund: FundDeployment }>> {
    try {
      const response = await spmcClient.listGroups({ limit: 100 });
      if (!response.success || !response.data) {
        return [];
      }

      const groupsWithFunds: Array<{ group: SPMCGroup; fund: FundDeployment }> = [];

      for (const group of response.data.groups) {
        const metadata = group.metadata as GroupFundMetadata;
        if (metadata?.fund_deployment) {
          groupsWithFunds.push({
            group,
            fund: metadata.fund_deployment,
          });
        }
      }

      return groupsWithFunds;
    } catch (error) {
      console.error('Error fetching groups with funds:', error);
      return [];
    }
  }

  /**
   * Generate market URL based on platform
   */
  private getMarketUrl(platform: string, marketId: string): string {
    switch (platform?.toLowerCase()) {
      case 'polymarket':
        return `https://polymarket.com/market/${marketId}`;
      case 'kalshi':
        // Kalshi uses different URL structure
        return `https://kalshi.com/markets/${marketId}`;
      case 'limitless':
        return `https://limitless.exchange/market/${marketId}`;
      default:
        return '';
    }
  }

  /**
   * Calculate suggested fund parameters from group data
   */
  async calculateSuggestedParameters(group: SPMCGroup): Promise<{
    suggestedTargetRaise: number;
    suggestedTradingDays: number;
    totalMarketLiquidity: number;
    earliestExpiration?: Date;
  }> {
    const markets = group.markets || [];
    
    // Calculate total liquidity
    let totalLiquidity = 0;
    let earliestExpiration: Date | undefined;

    for (const market of markets) {
      // Add market liquidity if available
      if (market.market_current_price) {
        totalLiquidity += market.market_current_price * 10000; // Rough estimate
      }

      // Track earliest expiration
      const expirationDate = market.market_expiration_date || market.market_close_time;
      if (expirationDate) {
        const expDate = new Date(expirationDate);
        if (!earliestExpiration || expDate < earliestExpiration) {
          earliestExpiration = expDate;
        }
      }
    }

    // Suggest 10% of total liquidity as target raise, min $1000, max $100k
    const suggestedTargetRaise = Math.min(
      Math.max(totalLiquidity * 0.1, 1000),
      100000
    );

    // Calculate trading days until earliest expiration
    let suggestedTradingDays = 7; // Default
    if (earliestExpiration) {
      const daysUntilExpiration = Math.floor(
        (earliestExpiration.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      // Allow some buffer time for deposit phase
      suggestedTradingDays = Math.max(1, daysUntilExpiration - 7);
    }

    return {
      suggestedTargetRaise: Math.round(suggestedTargetRaise),
      suggestedTradingDays,
      totalMarketLiquidity: Math.round(totalLiquidity),
      earliestExpiration,
    };
  }
}

export const groupFundIntegrationService = new GroupFundIntegrationService();