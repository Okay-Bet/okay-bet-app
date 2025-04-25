// src/components/types/approval.ts

export type ApprovalStatus = "none" | "approving" | "pending" | "approved";

export interface ApprovalStep {
  status: ApprovalStatus;
  tokenAddress?: string;
  spender?: string;
  amount?: string;
}

export interface ApprovalState {
  isLoading: boolean;
  approvalStep: ApprovalStep;
  status: {
    state: "idle" | "submitting_order" | "completed" | "failed";
    error?: string;
  };
}