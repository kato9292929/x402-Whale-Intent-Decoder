import { paymentMiddleware } from "x402-next";

export const middleware = paymentMiddleware(
  process.env.WALLET_ADDRESS!,
  {
    "/api/whale-alert": {
      price: "$0.10",
      network: "base",
      description: "Whale Alert - EVM chains",
    },
    "/api/whale-alert/solana": {
      price: "$0.10",
      network: "solana",
      description: "Whale Alert - Solana",
    },
    "/api/decode": {
      price: "$0.30",
      network: "base",
      description: "Whale Intent Decode",
    },
    "/api/weekly-whales": {
      price: "$0.50",
      network: "base",
      description: "Weekly Whale Report",
    },
  }
);

export const config = {
  matcher: ["/api/whale-alert/:path*", "/api/decode", "/api/weekly-whales"],
};
