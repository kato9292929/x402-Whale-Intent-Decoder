import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { kv } from "@vercel/kv";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET() {
  const cacheKey = "weekly-whales-v1";

  // Check KV cache
  try {
    const cached = await kv.get(cacheKey);
    if (cached) return NextResponse.json(cached);
  } catch {}

  // Fetch top whale movements
  let transactions: Record<string, unknown>[] = [];
  try {
    const res = await fetch(
      "https://api.nansen.ai/v2/transactions?chain=base&min_usd=500000&limit=10",
      { headers: { "x-api-key": process.env.NANSEN_API_KEY || "" } }
    );
    if (res.ok) {
      const data = await res.json();
      transactions = data.transactions || [];
    }
  } catch {}

  // Mock data if Nansen unavailable
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

  // Decode each with Claude
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
        const text =
          msg.content[0].type === "text" ? msg.content[0].text : "{}";
        const m = text.match(/\{[\s\S]*\}/);
        return { ...tx, ...(m ? JSON.parse(m[0]) : {}) };
      } catch {
        return { ...tx, intent: "UNKNOWN", confidence: 0.5 };
      }
    })
  );

  const result = {
    week: new Date().toISOString().slice(0, 10),
    whales: decoded,
  };

  // Cache 24h
  try {
    await kv.set(cacheKey, result, { ex: 86400 });
  } catch {}

  return NextResponse.json(result);
}
