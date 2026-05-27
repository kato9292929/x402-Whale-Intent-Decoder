import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { withX402 } from "@x402/next";
import { x402Server } from "@/lib/x402";

const WALLET_BASE =
  process.env.WALLET_ADDRESS_BASE ||
  process.env.WALLET_ADDRESS ||
  "0xC67d94504696960bA0f2e7C3FeE703950734c00A";
const WALLET_SOLANA =
  process.env.WALLET_ADDRESS_SOLANA || "4s8XQC2WzRfgH8Xiep7ybnCW11VKRCMwxQF6jknx3VPf";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-PAYMENT, X-PAYMENT-RESPONSE",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

async function handler(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { walletAddress, txHash, amount, fromChain, toChain } = body;

    let walletHistory: { transactions?: unknown[] } | null = null;
    try {
      const chain = fromChain || "base";
      const endpoint =
        chain === "solana"
          ? `https://api.nansen.ai/v2/wallet/${walletAddress}/transactions?chain=solana`
          : `https://api.nansen.ai/v2/wallet/${walletAddress}/transactions?chain=${chain}`;
      const res = await fetch(endpoint, {
        headers: { "x-api-key": process.env.NANSEN_API_KEY || "" },
      });
      if (res.ok) walletHistory = await res.json();
    } catch {}

    const historyText = walletHistory
      ? JSON.stringify(walletHistory.transactions?.slice(0, 20) || [])
      : "No historical data available.";

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: `You are an onchain behavior analyst. Analyze the wallet's transaction history and classify the intent of the latest large movement.

Classify into exactly one of: EXIT_PREPARATION, POSITION_BUILDING, BRIDGE, ACCUMULATION, UNKNOWN

Return JSON only — no explanation outside the JSON:
{
  "intent": "EXIT_PREPARATION",
  "confidence": 0.78,
  "reasoning_ja": "過去30日間でCEXへの送金が3回確認。今回の移動パターンは出金準備と類似。",
  "risk_level": "high",
  "similar_past_behavior": [
    "2024-11-12: Binanceへ送金 $250K",
    "2024-10-03: OKXへ送金 $180K"
  ]
}`,
      messages: [
        {
          role: "user",
          content: `Wallet: ${walletAddress}
Transaction: ${txHash}
Amount: $${amount?.toLocaleString() || "unknown"} USD
From: ${fromChain || "unknown"}
To: ${toChain || "unknown"}

Recent transaction history (last 20 transactions):
${historyText}`,
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
          similar_past_behavior: [],
        };

    return NextResponse.json(result, { headers: corsHeaders });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Internal error", detail },
      { status: 502, headers: corsHeaders }
    );
  }
}

export const POST = withX402(
  handler,
  {
    accepts: [
      {
        scheme: "exact",
        payTo: WALLET_BASE as `0x${string}`,
        price: "$0.30",
        network: "eip155:8453",
      },
      {
        scheme: "exact",
        payTo: WALLET_SOLANA,
        price: "$0.30",
        network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      },
    ],
    description: "Whale Intent Decode — Claude AI による意図推論",
    mimeType: "application/json",
  },
  x402Server
);
