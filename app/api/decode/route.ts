import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { withX402 } from "@x402/next";
import { x402Server } from "@/lib/x402";

const FALLBACK_EVM = "0x0000000000000000000000000000000000000001" as `0x${string}`;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

// Input: single candidate selected by the buyer's gate logic.
// Wallet-sourced:      { walletAddress, txHash, amount, fromChain, toChain }
// Hyperliquid-sourced: { token, divergenceScore, smartMoneyBias, fromChain? }
//   — when walletAddress is absent, the top whale tx for `token` is fetched from Nansen.
//
// Output: recommendation only — "executed" is not returned.
//   The buyer enforces executed=false locally (Stage 1) and applies its own limits.
const handler = async (req: NextRequest) => {
  const body = await req.json();
  const {
    walletAddress: providedWallet,
    txHash: providedTxHash,
    amount: providedAmount,
    fromChain,
    toChain,
    // Hyperliquid-sourced (optional)
    token,
    divergenceScore,
    smartMoneyBias,
  } = body;

  const chain = fromChain || "base";

  // Resolve wallet identity: use provided fields or fetch from Nansen by token.
  let walletAddress = providedWallet || "unknown";
  let txHash = providedTxHash || "unknown";
  let amount: number = providedAmount || 0;

  if (!providedWallet && token) {
    try {
      const res = await fetch(
        `https://api.nansen.ai/v2/transactions?chain=${chain}&token_symbol=${token}&min_usd=100000`,
        { headers: { "x-api-key": process.env.NANSEN_API_KEY || "" } }
      );
      if (res.ok) {
        const data = await res.json();
        const tx = data.transactions?.[0];
        if (tx) {
          walletAddress = tx.walletAddress ?? walletAddress;
          txHash = tx.txHash ?? txHash;
          amount = tx.amountUsd ?? amount;
        }
      }
    } catch {}
  }

  // Wallet history for richer intent context.
  let walletHistory: { transactions?: unknown[] } | null = null;
  if (walletAddress !== "unknown") {
    try {
      const endpoint =
        chain === "solana"
          ? `https://api.nansen.ai/v2/wallet/${walletAddress}/transactions?chain=solana`
          : `https://api.nansen.ai/v2/wallet/${walletAddress}/transactions?chain=${chain}`;
      const res = await fetch(endpoint, {
        headers: { "x-api-key": process.env.NANSEN_API_KEY || "" },
      });
      if (res.ok) walletHistory = await res.json();
    } catch {}
  }

  const historyText = walletHistory
    ? JSON.stringify(walletHistory.transactions?.slice(0, 20) || [])
    : "No historical data available.";

  // Include Hyperliquid signal context when present.
  const hlContext =
    token && divergenceScore !== undefined
      ? `\nToken: ${token}\nHyperliquid Divergence Score: ${divergenceScore}\nSmart Money Bias: ${smartMoneyBias || "unknown"}`
      : "";

  const message = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 1024,
    system: `You are an onchain behavior analyst. Analyze the wallet's transaction history and classify the intent of the latest large movement.

Classify into exactly one of: EXIT_PREPARATION, POSITION_BUILDING, BRIDGE, ACCUMULATION, UNKNOWN

Return JSON only — no explanation outside the JSON:
{
  "intent": "EXIT_PREPARATION",
  "confidence": 0.78,
  "reasoning_ja": "過去30日間でCEヘの送金が3回確認。今回の移動パターンは出金準備と類似。",
  "risk_level": "high",
  "recommendation": "BUY",
  "size": 0.0,
  "similar_past_behavior": [
    "2024-11-12: Binanceへ送金 $250K"
  ]
}

"recommendation" is BUY when intent signals accumulation/position-building with confidence >= 0.65, otherwise SKIP.
"size" (0.0–1.0) is the suggested position fraction — 0.0 when recommendation is SKIP.
Do NOT include an "executed" field; execution decisions belong to the caller.`,
    messages: [
      {
        role: "user",
        content: `Wallet: ${walletAddress}\nTransaction: ${txHash}\nAmount: $${amount?.toLocaleString() || "unknown"} USD\nFrom: ${fromChain || "unknown"}\nTo: ${toChain || "unknown"}${hlContext}\n\nRecent transaction history (last 20 transactions):\n${historyText}`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const result = jsonMatch
    ? JSON.parse(jsonMatch[0])
    : {
        intent: "UNKNOWN",
        confidence: 0.5,
        reasoning_ja: "解析に失敗しました。",
        risk_level: "medium",
        recommendation: "SKIP",
        size: 0,
        similar_past_behavior: [],
      };

  // Guarantee "executed" is never in the response — buyer controls that.
  delete result.executed;

  return NextResponse.json(result);
};

const payTo = (process.env.WALLET_ADDRESS || FALLBACK_EVM) as `0x${string}`;

export const POST = withX402(
  handler,
  {
    accepts: [
      {
        scheme: "exact",
        price: "$0.30",
        network: "eip155:8453",
        payTo,
      },
    ],
    description: "Whale Intent Decode",
    mimeType: "application/json",
  },
  x402Server
);
