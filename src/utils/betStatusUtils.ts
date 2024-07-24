// utils/betStatusUtils.ts

export enum BetStatus {
    Unfunded = 0,
    PartiallyFunded = 1,
    FullyFunded = 2,
    Open = 3,
    Resolved = 4,
    Cancelled = 5,
    Invalidated = 6
  }
  
  export function determineRefreshTarget(oldStatus: BetStatus, newStatus: BetStatus): 'unfunded' | 'open' | 'history' | null {
    if (oldStatus <= BetStatus.FullyFunded && newStatus === BetStatus.Open) {
      return 'open';
    } else if (oldStatus <= BetStatus.Open && newStatus > BetStatus.Open) {
      return 'history';
    } else if (newStatus <= BetStatus.FullyFunded && oldStatus !== newStatus) {
      return 'unfunded';
    }
    return null;
  }