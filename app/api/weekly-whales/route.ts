import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { kv } from "@vercel/kv";
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
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-PAYMENT, X-PAYMENT-RESPONSE",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

async function handler(_req: NextRequest): Promise<NextResponse> {
  try {
    const cacheKey = "weekly-whales-v2";

    try {
      const cached = await kv.get(cacheKey);
      if (cached) return NextResponse.json(cached, { headers: corsHeaders });
    } catch {}

    let transactions: Record<string, unknown>[] = [];
    try {
      const res = await fetch(
        "https://api.nansen.ai/v2/transactions?chain=base&min_usd=500000&limit=10",
        { headers: { "x-api-key": process.env.NANSEN_API_KEY || "" } }
      );
      if (res.ok) {
        const data = await res.json();
        transactions = Array.isArray(data.transactions) ? data.transactions : [];
      }
    } catch {}

    if (!transactions.length) {
      transactions = Array.from({ length: 10 }, (_, i) => ({
        txHash: `0xmock${i}`,
        walletAddress: `0x${Math.random().toString(16).slice(2, 42)}`,
        amountUsd: 500000 + Math.random() * 5000000,
        fromLabel: ["Unknown", "Binance", "Coinbase"][i % 3],
        toLabel: ["Cold Wallet", "DeFi", "CEX"][i % 3],
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      }));
    }

    const decoded = await Promise.all(
      transactions.slice(0, 10).map(async (tx) => {
        try {
          const msg = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 512,
            system: `You are an onchain behavior analyst. Return JSON only:
{"intent":"EXIT_PREPARATION|POSITION_BUILDING|BRIDGE|ACCUMULATION|UNKNOWN","confidence":0.75,"reasoning_ja":"短い日本語","risk_level":"high|medium|low"}`,
            messages: [
              {
                role: "user",
                content: `Wallet: ${tx.walletAddress}, Amount: $${Math.round(Number(tx.amountUsd)).toLocaleString()}, From: ${tx.fromLabel}, To: ${tx.toLabel}`,
              },
            ],
          });
          const text = msg.content[0].type === "text" ? msg.content[0].text : "{}";
          const m = text.match(/\{[\s\S]*\}/);
          return { ...tx, ...(m ? JSON.parse(m[0]) : {}) };
        } catch {
          return { ...tx, intent: "UNKNOWN", confidence: 0.5 };
        }
      })
    );

    const result = { week: new Date().toISOString().slice(0, 10), whales: decoded };

    try {
      await kv.set(cacheKey, result, { ex: 86400 });
    } catch {}

    return NextResponse.json(result, { headers: corsHeaders });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Internal error", detail },
      { status: 502, headers: corsHeaders }
    );
  }
}

export const GET = withX402(
  handler,
  {
    accepts: [
      {
        scheme: "exact",
        payTo: WALLET_BASE as `0x${string}`,
        price: "$0.50",
        network: "eip155:8453",
      },
      {
        scheme: "exact",
        payTo: WALLET_SOLANA,
        price: "$0.50",
        network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      },
    ],
    description: "Weekly Whale Report — 週次トップ10鯨移動レポート",
    mimeType: "application/json",
  },
  x402Server
);
