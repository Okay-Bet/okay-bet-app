// src/types/validation.ts

export interface ValidationResponse {
    valid: boolean;
    estimated_total: number;    
    price_impact: number;      
    execution_possible: boolean;
    warning: string | null;
    min_order_size: number;
    max_order_size: number;
  }
  
  export interface ValidationState {
    state: "validating" | "validated" | "validation_failed" | "error";
    data?: ValidationResponse;
    error?: string;
  }