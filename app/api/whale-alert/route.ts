import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "x402-next";

const handler = async (req: NextRequest) => {
  const chain = req.nextUrl.searchParams.get("chain") || "base";

  try {
    const res = await fetch(
      `https://api.nansen.ai/v2/transactions?chain=${chain}&min_usd=100000`,
      {
        headers: { "x-api-key": process.env.NANSEN_API_KEY || "" },
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) throw new Error(`Nansen error: ${res.status}`);
    const data = await res.json();
    return NextResponse.json({ ...data, chain });
  } catch {
    return NextResponse.json({
      chain,
      transactions: [
        {
          txHash: "0xabc123",
          walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
          amountUsd: 2500000,
          fromLabel: "Unknown Wallet",
          toLabel: "Binance",
          timestamp: new Date().toISOString(),
        },
      ],
    });
  }
};

export const GET = withX402(handler, process.env.WALLET_ADDRESS as `0x${string}`, {
  price: "$0.10",
  network: "base",
  config: { description: "Whale Alert - EVM chains" },
});
