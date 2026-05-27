import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402/next";
import { x402Server } from "@/lib/x402";

const WALLET_BASE =
  process.env.WALLET_ADDRESS_BASE ||
  process.env.WALLET_ADDRESS ||
  "0xC67d94504696960bA0f2e7C3FeE703950734c00A";
const WALLET_SOLANA =
  process.env.WALLET_ADDRESS_SOLANA || "4s8XQC2WzRfgH8Xiep7ybnCW11VKRCMwxQF6jknx3VPf";

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
    const res = await fetch(
      "https://api.nansen.ai/v2/transactions?chain=solana&min_usd=100000",
      {
        headers: { "x-api-key": process.env.NANSEN_API_KEY || "" },
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) throw new Error(`Nansen error: ${res.status}`);
    const data = await res.json();
    return NextResponse.json({ ...data, chain: "solana" }, { headers: corsHeaders });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        chain: "solana",
        transactions: [
          {
            txHash: "5KJp9v8mN3xQ7rT2sW4yU6iO",
            walletAddress: "GHjK2mP9nL5qR8tV3xW7yZ1aB4cD6eF",
            amountUsd: 1200000,
            fromLabel: "Solana Wallet",
            toLabel: "Bridge Protocol",
            timestamp: new Date().toISOString(),
          },
        ],
        _mock: true,
        _error: detail,
      },
      { headers: corsHeaders }
    );
  }
}

export const GET = withX402(
  handler,
  {
    accepts: [
      {
        scheme: "exact",
        payTo: WALLET_SOLANA,
        price: "$0.10",
        network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      },
      {
        scheme: "exact",
        payTo: WALLET_BASE as `0x${string}`,
        price: "$0.10",
        network: "eip155:8453",
      },
    ],
    description: "Whale Alert — Solana ($100K+移動)",
    mimeType: "application/json",
  },
  x402Server
);
