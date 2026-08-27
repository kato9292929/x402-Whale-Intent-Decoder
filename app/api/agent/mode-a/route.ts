import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { withX402 } from "@x402/next";
import { x402Server } from "@/lib/x402";

const FALLBACK_EVM = "0x0000000000000000000000000000000000000001" as `0x${string}`;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
// Minimum Hyperliquid divergence score to trigger Decoder (OR gate threshold)
const HL_DIVERGENCE_MIN_SCORE = parseFloat(
  process.env.HL_DIVERGENCE_MIN_SCORE || "0.75"
);

interface HLDivergence {
  token: string;
  divergenceScore: number;
  smartMoneyBias: "long" | "short" | "neutral";
}

interface AnalyzerCandidate {
  token: string;
  walletAddress?: string;
  txHash?: string;
  amountUsd?: number;
}

/** Select highest-scoring HL divergence that meets the threshold. */
function selectFromHyperliquid(
  divergences: HLDivergence[],
  minScore: number
): HLDivergence | null {
  return (
    divergences
      .filter((d) => d.divergenceScore >= minScore)
      .sort((a, b) => b.divergenceScore - a.divergenceScore)[0] ?? null
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handler = async (req: NextRequest): Promise<NextResponse<any>> => {
  // Body: { analyzerResults?: AnalyzerCandidate[], hyperliquidDivergences?: HLDivergence[] }
  // Both arrays are provided by the caller (AA repo) — this endpoint does not fetch them.
  let analyzerResults: AnalyzerCandidate[] = [];
  let hyperliquidDivergences: HLDivergence[] = [];

  try {
    const body = await req.json();
    analyzerResults = body.analyzerResults ?? [];
    hyperliquidDivergences = body.hyperliquidDivergences ?? [];
  } catch {
    // Accept GET with no body for health/test calls; both arrays stay empty
  }

  // ── OR Gate ────────────────────────────────────────────────────────────────
  // Primary source: Divergence Analyzer (x402nansenpolymarket)
  let source: "analyzer" | "hyperliquid" = "analyzer";
  let analyzerCandidate: AnalyzerCandidate | null = analyzerResults[0] ?? null;
  let hlCandidate: HLDivergence | null = null;

  if (analyzerCandidate) {
    console.log(
      `[Mode-A] Analyzer fired: token=${analyzerCandidate.token} wallet=${analyzerCandidate.walletAddress}`
    );
  } else {
    // Fallback: Hyperliquid topDivergences
    hlCandidate = selectFromHyperliquid(
      hyperliquidDivergences,
      HL_DIVERGENCE_MIN_SCORE
    );

    if (!hlCandidate) {
      console.log(
        `[Mode-A] No fire. Analyzer results=${analyzerResults.length}, HL candidates=${hyperliquidDivergences.length}, HL threshold=${HL_DIVERGENCE_MIN_SCORE}`
      );
      return NextResponse.json({
        decision: "SKIP",
        reason: "no_candidates",
        executed: false,
        meta: {
          analyzerResults: analyzerResults.length,
          hlCandidates: hyperliquidDivergences.length,
          hlThreshold: HL_DIVERGENCE_MIN_SCORE,
        },
        timestamp: new Date().toISOString(),
      });
    }

    source = "hyperliquid";
    console.log(
      `[Mode-A] HL fired: token=${hlCandidate.token} score=${hlCandidate.divergenceScore} bias=${hlCandidate.smartMoneyBias}`
    );
  }

  // Resolve canonical fields for Decoder
  const token =
    analyzerCandidate?.token ?? hlCandidate!.token;
  const knownWallet = analyzerCandidate?.walletAddress;
  const knownTxHash = analyzerCandidate?.txHash;
  const knownAmount = analyzerCandidate?.amountUsd;

  // Fetch top whale transaction for the token from Nansen (best-effort)
  let walletAddress = knownWallet ?? "unknown";
  let txHash = knownTxHash ?? "unknown";
  let amount = knownAmount ?? 0;
  let fromChain = "base";

  if (!knownWallet) {
    try {
      const nansenRes = await fetch(
        `https://api.nansen.ai/v2/transactions?chain=base&token_symbol=${token}&min_usd=100000`,
        {
          headers: { "x-api-key": process.env.NANSEN_API_KEY || "" },
          next: { revalidate: 60 },
        }
      );
      if (nansenRes.ok) {
        const nansenData = await nansenRes.json();
        const tx = nansenData.transactions?.[0];
        if (tx) {
          walletAddress = tx.walletAddress ?? walletAddress;
          txHash = tx.txHash ?? txHash;
          amount = tx.amountUsd ?? amount;
          fromChain = tx.chain ?? fromChain;
        }
      }
    } catch {
      // Proceed with unknown wallet — Decoder handles it gracefully
    }
  }

  // ── Decoder (Claude) ───────────────────────────────────────────────────────
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let intent = "UNKNOWN";
  let confidence = 0.5;
  let reasoningJa = "";
  let decision: "BUY" | "SKIP" = "SKIP";
  let size = 0;

  try {
    const msg = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 512,
      system: `You are an onchain behavior analyst specializing in whale-intent decoding.
Classify the whale movement and return a trading decision.

Return JSON only:
{
  "intent": "ACCUMULATION" | "EXIT_PREPARATION" | "POSITION_BUILDING" | "BRIDGE" | "UNKNOWN",
  "confidence": 0.0-1.0,
  "decision": "BUY" | "SKIP",
  "size": 0.0-1.0,
  "reasoning_ja": "..."
}`,
      messages: [
        {
          role: "user",
          content: `Token: ${token}
Source: ${source}
${source === "hyperliquid" ? `Divergence Score: ${hlCandidate!.divergenceScore}\nSmart Money Bias: ${hlCandidate!.smartMoneyBias}` : ""}
Whale Wallet: ${walletAddress}
Tx Hash: ${txHash}
Amount: $${amount.toLocaleString()} USD
Chain: ${fromChain}`,
        },
      ],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const decoded = JSON.parse(jsonMatch[0]);
      intent = decoded.intent ?? intent;
      confidence = decoded.confidence ?? confidence;
      decision = decoded.decision === "BUY" ? "BUY" : "SKIP";
      size = decoded.size ?? (decision === "BUY" ? confidence * 0.5 : 0);
      reasoningJa = decoded.reasoning_ja ?? reasoningJa;
    }
  } catch (err) {
    console.error(`[Mode-A] Decoder error: ${err}`);
    return NextResponse.json({
      decision: "SKIP",
      token,
      source,
      intent,
      confidence,
      size: 0,
      executed: false,
      error: "decode_failed",
      timestamp: new Date().toISOString(),
    });
  }

  console.log(
    `[Mode-A] Result: decision=${decision} token=${token} confidence=${confidence} size=${size} source=${source} executed=false`
  );

  return NextResponse.json({
    decision,
    token,
    source,
    intent,
    confidence,
    size,
    reasoning_ja: reasoningJa,
    walletAddress,
    txHash,
    amountUsd: amount,
    executed: false,
    timestamp: new Date().toISOString(),
  });
};

const payTo = (process.env.WALLET_ADDRESS || FALLBACK_EVM) as `0x${string}`;

export const POST = withX402(
  handler,
  {
    accepts: [
      {
        scheme: "exact",
        price: "$0.35",
        network: "eip155:8453",
        payTo,
      },
    ],
    description: "Mode A Gate — Whale Intent Decision Oracle",
    mimeType: "application/json",
  },
  x402Server
);
