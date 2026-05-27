import { NextResponse } from "next/server";

const WALLET_BASE =
  process.env.WALLET_ADDRESS_BASE ||
  process.env.WALLET_ADDRESS ||
  "0xC67d94504696960bA0f2e7C3FeE703950734c00A";
const WALLET_SOLANA =
  process.env.WALLET_ADDRESS_SOLANA || "4s8XQC2WzRfgH8Xiep7ybnCW11VKRCMwxQF6jknx3VPf";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  const discovery = {
    x402Version: 2,
    endpoints: [
      {
        path: "/api/whale-alert",
        method: "GET",
        description: "Whale Alert — EVM chains ($100K+移動)",
        mimeType: "application/json",
        accepts: [
          {
            scheme: "exact",
            network: "eip155:8453",
            price: "$0.10",
            payTo: WALLET_BASE,
          },
          {
            scheme: "exact",
            network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
            price: "$0.10",
            payTo: WALLET_SOLANA,
          },
        ],
      },
      {
        path: "/api/whale-alert/solana",
        method: "GET",
        description: "Whale Alert — Solana ($100K+移動)",
        mimeType: "application/json",
        accepts: [
          {
            scheme: "exact",
            network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
            price: "$0.10",
            payTo: WALLET_SOLANA,
          },
          {
            scheme: "exact",
            network: "eip155:8453",
            price: "$0.10",
            payTo: WALLET_BASE,
          },
        ],
      },
      {
        path: "/api/decode",
        method: "POST",
        description: "Whale Intent Decode — Claude AI による意図推論",
        mimeType: "application/json",
        accepts: [
          {
            scheme: "exact",
            network: "eip155:8453",
            price: "$0.30",
            payTo: WALLET_BASE,
          },
          {
            scheme: "exact",
            network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
            price: "$0.30",
            payTo: WALLET_SOLANA,
          },
        ],
      },
      {
        path: "/api/weekly-whales",
        method: "GET",
        description: "Weekly Whale Report — 週次トップ10鯨移動レポート",
        mimeType: "application/json",
        accepts: [
          {
            scheme: "exact",
            network: "eip155:8453",
            price: "$0.50",
            payTo: WALLET_BASE,
          },
          {
            scheme: "exact",
            network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
            price: "$0.50",
            payTo: WALLET_SOLANA,
          },
        ],
      },
    ],
  };

  return NextResponse.json(discovery, { headers: corsHeaders });
}
