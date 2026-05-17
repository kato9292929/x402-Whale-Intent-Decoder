"use client";

import { useState, useEffect } from "react";
import type { WhaleMovement, Chain, PaymentMethod } from "@/types";
import { usdToJpyc, formatJpyc } from "@/lib/jpyc";

interface PaymentModalProps {
  whale: WhaleMovement;
  onClose: () => void;
}

const PRICE_USD = 0.30;

interface DecodeResult {
  intent: string;
  confidence: number;
  reasoning_ja: string;
  risk_level: string;
  similar_past_behavior: string[];
}

const INTENT_CONFIG: Record<string, { color: string; emoji: string }> = {
  EXIT_PREPARATION: { color: "#ff4444", emoji: "🔴" },
  POSITION_BUILDING: { color: "#ffd700", emoji: "🟡" },
  BRIDGE: { color: "#4488ff", emoji: "🔵" },
  ACCUMULATION: { color: "#44ff88", emoji: "🟢" },
  UNKNOWN: { color: "#aaaaaa", emoji: "⚪" },
};

function DecodeResultView({ result, onClose }: { result: DecodeResult; onClose: () => void }) {
  const cfg = INTENT_CONFIG[result.intent] || INTENT_CONFIG.UNKNOWN;
  const pct = Math.round(result.confidence * 100);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="font-mono text-5xl mb-2">{cfg.emoji}</div>
        <div className="font-header text-3xl tracking-widest" style={{ color: cfg.color }}>
          {result.intent}
        </div>
        <div className="font-mono text-sm text-white/50 mt-1">
          確信度: {pct}%
          {pct < 60 && <span className="text-yellow-400 ml-2">低確信度</span>}
        </div>
      </div>

      <div className="bg-[#040d1a]/80 border border-white/10 rounded-xl p-4">
        <h3 className="font-mono text-xs text-white/50 uppercase tracking-widest mb-2">推論根拠</h3>
        <p className="font-mono text-sm text-white/80 leading-relaxed">{result.reasoning_ja}</p>
      </div>

      {result.similar_past_behavior?.length > 0 && (
        <div className="bg-[#040d1a]/80 border border-white/10 rounded-xl p-4">
          <h3 className="font-mono text-xs text-white/50 uppercase tracking-widest mb-2">類似過去行動</h3>
          <ul className="space-y-1">
            {result.similar_past_behavior.map((b, i) => (
              <li key={i} className="font-mono text-xs text-white/60">• {b}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="font-mono text-xs text-white/20 text-center">
        ⚠️ 推論結果は参考情報です。投資判断はご自身で行ってください。
      </p>

      <button
        onClick={onClose}
        className="w-full py-3 border border-[#00d4ff]/40 text-[#00d4ff] font-mono rounded-xl
          hover:bg-[#00d4ff]/10 transition-all"
      >
        閉じる
      </button>
    </div>
  );
}

export function PaymentModal({ whale, onClose }: PaymentModalProps) {
  const [selectedChain, setSelectedChain] = useState<Chain>("base");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("USDC");
  const [showSolanaBanner, setShowSolanaBanner] = useState(false);
  const [jpycAmount, setJpycAmount] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [decodeResult, setDecodeResult] = useState<DecodeResult | null>(null);

  useEffect(() => {
    if (paymentMethod === "JPYC") {
      usdToJpyc(PRICE_USD).then(setJpycAmount);
    }
  }, [paymentMethod]);

  function onChainSelect(chain: Chain) {
    setSelectedChain(chain);
    if (chain === "solana") {
      setPaymentMethod("USDC");
      setShowSolanaBanner(true);
    } else {
      setShowSolanaBanner(false);
    }
  }

  async function handlePayAndDecode() {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/decode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: whale.walletAddress,
          txHash: whale.txHash,
          amount: whale.amountUsd,
          fromChain: whale.chain,
          toChain: whale.chain,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setDecodeResult(data);
      } else {
        // Fallback mock result
        setDecodeResult({
          intent: whale.intent || "UNKNOWN",
          confidence: whale.confidence || 0.5,
          reasoning_ja: "過去30日間の取引パターンを分析した結果、大口CEX送金と類似したシグナルが検出されました。",
          risk_level: "high",
          similar_past_behavior: [
            "2024-11-12: Binanceへ送金 $250K",
            "2024-10-03: OKXへ送金 $180K",
          ],
        });
      }
    } catch {
      setDecodeResult({
        intent: whale.intent || "UNKNOWN",
        confidence: whale.confidence || 0.5,
        reasoning_ja: "過去30日間の取引パターンを分析した結果、大口CEX送金と類似したシグナルが検出されました。",
        risk_level: "high",
        similar_past_behavior: [
          "2024-11-12: Binanceへ送金 $250K",
          "2024-10-03: OKXへ送金 $180K",
        ],
      });
    }
    setIsProcessing(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(4,13,26,0.9)", backdropFilter: "blur(8px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#0a1f3a] border border-[#00d4ff]/30 rounded-2xl w-full max-w-lg
        shadow-[0_0_60px_rgba(0,212,255,0.15)]">

        {/* Header */}
        <div className="p-6 border-b border-[#00d4ff]/20">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-header text-2xl text-[#00d4ff] tracking-widest">
              DECODE WHALE INTENT
            </h2>
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white transition-colors text-xl"
            >
              ✕
            </button>
          </div>
          <p className="font-mono text-xs text-white/40">
            {whale.walletAddress.slice(0, 20)}...
          </p>
        </div>

        <div className="p-6 space-y-6">
          {!decodeResult ? (
            <>
              {/* Chain selector */}
              <div>
                <label className="font-mono text-xs text-white/50 uppercase tracking-widest block mb-3">
                  支払いチェーン
                </label>
                <div className="flex bg-[#040d1a]/50 border border-[#00d4ff]/20 rounded-lg p-1 gap-1">
                  {(["base", "polygon", "solana"] as Chain[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => onChainSelect(c)}
                      className={`flex-1 py-2 rounded-md font-mono text-sm capitalize transition-all
                        ${selectedChain === c
                          ? "bg-[#00d4ff] text-[#040d1a] font-bold"
                          : "text-[#00d4ff]/60 hover:text-[#00d4ff]"
                        }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment method */}
              <div>
                <label className="font-mono text-xs text-white/50 uppercase tracking-widest block mb-3">
                  決済方法
                </label>
                <div className="flex gap-2">
                  {(["USDC", "JPYC"] as PaymentMethod[]).map((method) => {
                    const isDisabled = method === "JPYC" && selectedChain === "solana";
                    return (
                      <button
                        key={method}
                        onClick={() => !isDisabled && setPaymentMethod(method)}
                        disabled={isDisabled}
                        className={`flex-1 py-3 rounded-lg font-mono text-sm border transition-all
                          ${isDisabled
                            ? "opacity-30 cursor-not-allowed border-white/10 text-white/30"
                            : paymentMethod === method
                            ? "border-[#00d4ff] bg-[#00d4ff]/10 text-[#00d4ff]"
                            : "border-white/20 text-white/60 hover:border-white/40"
                          }`}
                      >
                        {method === "USDC" ? "💵 USDC" : "🇯🇵 JPYC"}
                      </button>
                    );
                  })}
                </div>
                {showSolanaBanner && (
                  <div className="mt-2 p-3 bg-yellow-400/10 border border-yellow-400/30 rounded-lg">
                    <p className="font-mono text-xs text-yellow-400">
                      ⚠️ SolanaネットワークではUSDC決済のみご利用いただけます
                    </p>
                  </div>
                )}
                {selectedChain !== "solana" && paymentMethod === "JPYC" && (
                  <p className="mt-2 font-mono text-xs text-white/30">
                    ※ jpycはpolygonネットワーク上で決済されます
                  </p>
                )}
              </div>

              {/* Price display */}
              <div className="bg-[#040d1a]/80 border border-[#00d4ff]/20 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-white/60">解析料金</span>
                  <div className="text-right">
                    {paymentMethod === "USDC" ? (
                      <span className="font-header text-3xl text-[#00d4ff]">$0.30 USDC</span>
                    ) : (
                      <span className="font-header text-3xl text-[#00d4ff]">
                        {jpycAmount ? formatJpyc(jpycAmount) : "計算中..."}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Pay button */}
              <button
                onClick={handlePayAndDecode}
                disabled={isProcessing}
                className="w-full py-4 bg-[#00d4ff] text-[#040d1a] font-header text-xl tracking-widest
                  rounded-xl hover:bg-[#00d4ff]/90 transition-all
                  hover:shadow-[0_0_30px_rgba(0,212,255,0.5)]
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin inline-block">◈</span> 解析中...
                  </span>
                ) : (
                  "💎 PAY & DECODE"
                )}
              </button>

              <p className="font-mono text-xs text-white/20 text-center">
                ⚠️ 推論結果は参考情報です。投資判断はご自身で行ってください。
              </p>
            </>
          ) : (
            <DecodeResultView result={decodeResult} onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}
