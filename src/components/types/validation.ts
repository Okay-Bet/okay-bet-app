// src/types/validation.ts
export interface ValidationResult {
  isValid: boolean;
  estimatedTotal: bigint;
  priceImpact: number;
  canExecute: boolean;
  constraints: {
    minSize: bigint;
    maxSize: bigint;
  };
  warnings: string[];
  errors: string[];
}