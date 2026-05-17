import { NextResponse } from "next/server";

export async function GET() {
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
    return NextResponse.json({ ...data, chain: "solana" });
  } catch {
    return NextResponse.json({
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
    });
  }
}
