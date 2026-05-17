export type Chain = "base" | "polygon" | "solana";
export type PaymentMethod = "USDC" | "JPYC";
export type IntentType = "EXIT_PREPARATION" | "POSITION_BUILDING" | "BRIDGE" | "ACCUMULATION" | "UNKNOWN";
export type RiskLevel = "high" | "medium" | "low";
export type WhaleSize = "small" | "medium" | "large";

export interface WhaleMovement {
  txHash: string;
  walletAddress: string;
  amount: number;
  amountUsd: number;
  chain: Chain;
  fromLabel: string;
  toLabel: string;
  timestamp: string;
  intent?: IntentType;
  confidence?: number;
  whaleSize: WhaleSize;
}

export interface DecodeResult {
  intent: IntentType;
  confidence: number;
  reasoning_ja: string;
  risk_level: RiskLevel;
  similar_past_behavior: string[];
}
