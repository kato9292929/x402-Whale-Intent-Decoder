const NANSEN_BASE_URL = "https://api.nansen.ai";

export async function getWhaleTransactions(chain: string, minUsd = 100000) {
  const res = await fetch(
    `${NANSEN_BASE_URL}/v2/transactions?chain=${chain}&min_usd=${minUsd}`,
    {
      headers: {
        "x-api-key": process.env.NANSEN_API_KEY || "",
      },
    }
  );
  if (!res.ok) throw new Error(`Nansen API error: ${res.status}`);
  return res.json();
}

export async function getWalletHistory(address: string, chain: string) {
  const endpoint = chain === "solana"
    ? `/v2/wallet/${address}/transactions?chain=solana`
    : `/v2/wallet/${address}/transactions?chain=${chain}`;
  const res = await fetch(`${NANSEN_BASE_URL}${endpoint}`, {
    headers: {
      "x-api-key": process.env.NANSEN_API_KEY || "",
    },
  });
  if (!res.ok) throw new Error(`Nansen API error: ${res.status}`);
  return res.json();
}
