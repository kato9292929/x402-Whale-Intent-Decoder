import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { withX402 } from "@x402/next";
import { x402Server } from "@/lib/x402";

const FALLBACK_EVM = "0x0000000000000000000000000000000000000001" as `0x${string}`;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

// Chains tried in order when resolving a whale tx by token symbol.
// Base is tried first (most x402 traffic), then major EVM chains.
// HL-native tokens (HYPE etc.) often appear on Arbitrum/Ethereum bridges first.
const RESOLVE_CHAINS = ["base", "ethereum", "arbitrum", "optimism"];

async function resolveWhaleByToken(
  token: string,
  preferredChain: string
): Promise<{ walletAddress: string; txHash: string; amount: number; chain: string } | null> {
  const chains = [preferredChain, ...RESOLVE_CHAINS.filter((c) => c !== preferredChain)];
  for (const c of chains) {
    try {
      const res = await fetch(
        `https://api.nansen.ai/v2/transactions?chain=${c}&token_symbol=${encodeURIComponent(token)}&min_usd=100000`,
        { headers: { "x-api-key": process.env.NANSEN_API_KEY || "" } }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const tx = data.transactions?.[0];
      if (tx?.walletAddress) {
        return {
          walletAddress: tx.walletAddress,
          txHash: tx.txHash ?? "unknown",
          amount: tx.amountUsd ?? 0,
          chain: c,
        };
      }
    } catch {}
  }
  return null;
}

// Input: single candidate selected by the buyer's gate logic.
//
// Wallet-sourced:      { walletAddress, txHash, amount, fromChain, toChain }
// Hyperliquid-sourced: { token, divergenceScore, smartMoneyBias, fromChain? }
//   — when walletAddress is absent, the top whale tx is fetched from Nansen
//     across multiple chains. If resolution fails, returns NO_DATA (no Claude call).
//
// Output: recommendation only — "executed" is never returned.
//   The buyer enforces executed=false locally and applies its own per-call limits.
//   When intent === "NO_DATA", the buyer must NOT count this as a valid decision
//   and must NOT charge again (the $0.30 x402 fee is already settled).
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

  const preferredChain = fromChain || "base";

  let walletAddress = providedWallet || "unknown";
  let txHash = providedTxHash || "unknown";
  let amount: number = providedAmount || 0;
  let resolvedChain = preferredChain;

  // Resolve wallet identity when not provided by buyer.
  // Multi-chain fallback — HL tokens often aren't on Base.
  if (!providedWallet && token) {
    const resolved = await resolveWhaleByToken(token, preferredChain);
    if (resolved) {
      walletAddress = resolved.walletAddress;
      txHash = resolved.txHash;
      amount = resolved.amount;
      resolvedChain = resolved.chain;
    }
  }

  // No whale data → skip Claude call. Saves Claude cost; x402 fee is already settled.
  // Buyer must check intent === "NO_DATA" and not count this as a valid decision.
  if (walletAddress === "unknown") {
    return NextResponse.json({
      intent: "NO_DATA",
      confidence: 0,
      reasoning_ja: `トークン ${token ?? "不明"} の大口ウォレット履歴を複数チェーン（${RESOLVE_CHAINS.join("/")}）で取得できませんでした。decode をスキップしました。`,
      risk_level: "unknown",
      recommendation: "SKIP",
      size: 0,
      similar_past_behavior: [],
      _no_whale_resolved: true,
    });
  }

  // Wallet history for richer intent context.
  let walletHistory: { transactions?: unknown[] } | null = null;
  try {
    const endpoint =
      resolvedChain === "solana"
        ? `https://api.nansen.ai/v2/wallet/${walletAddress}/transactions?chain=solana`
        : `https://api.nansen.ai/v2/wallet/${walletAddress}/transactions?chain=${resolvedChain}`;
    const res = await fetch(endpoint, {
      headers: { "x-api-key": process.env.NANSEN_API_KEY || "" },
    });
    if (res.ok) walletHistory = await res.json();
  } catch {}

  const historyText = walletHistory
    ? JSON.stringify(walletHistory.transactions?.slice(0, 20) || [])
    : "No historical data available.";

  // Hyperliquid signal context when present.
  const hlContext =
    token && divergenceScore !== undefined
      ? `\nToken: ${token}\nHyperliquid Divergence Score: ${divergenceScore}\nSmart Money Bias: ${smartMoneyBias || "unknown"}`
      : "";

  const message = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 1024,
    system: `You are an onchain behavior analyst. Analyze the wallet's transaction history and classify the intent of the latest large movement.\n\nClassify into exactly one of: EXIT_PREPARATION, POSITION_BUILDING, BRIDGE, ACCUMULATION, UNKNOWN\n\nReturn JSON only — no explanation outside the JSON:\n{\n  "intent": "EXIT_PREPARATION",\n  "confidence": 0.78,\n  "reasoning_ja": "過去30日間でCEヘの送金が3回確認。今回の移動パターンは出金準備と類似。",\n  "risk_level": "high",\n  "recommendation": "BUY",\n  "size": 0.0,\n  "similar_past_behavior": [\n    "2024-11-12: Binanceへ送金 $250K"\n  ]\n}\n\n"recommendation" is BUY when intent signals accumulation/position-building with confidence >= 0.65, otherwise SKIP.\n"size" (0.0–1.0) is the suggested position fraction — 0.0 when recommendation is SKIP.\nDo NOT include an "executed" field; execution decisions belong to the caller.`,
    messages: [
      {
        role: "user",
        content: `Wallet: ${walletAddress}\nTransaction: ${txHash}\nAmount: $${amount?.toLocaleString() || "unknown"} USD\nFrom: ${resolvedChain}\nTo: ${toChain || "unknown"}${hlContext}\n\nRecent transaction history (last 20 transactions):\n${historyText}`,
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
