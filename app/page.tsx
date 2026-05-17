"use client";

import { useState } from "react";
import { SonarBackground } from "@/components/SonarBackground";
import { ChainSelector } from "@/components/ChainSelector";
import { WhaleCard } from "@/components/WhaleCard";
import { PaymentModal } from "@/components/PaymentModal";
import { MOCK_WHALE_DATA } from "@/lib/mockData";
import { WalletHeader } from "@/components/WalletHeader";
import type { WhaleMovement } from "@/types";

export default function Home() {
  const [selectedChain, setSelectedChain] = useState<"base" | "polygon" | "solana">("base");
  const [selectedWhale, setSelectedWhale] = useState<WhaleMovement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDecode = (whale: WhaleMovement) => {
    setSelectedWhale(whale);
    setIsModalOpen(true);
  };

  return (
    <main className="min-h-screen bg-[#040d1a] relative overflow-hidden">
      <SonarBackground />
      <WalletHeader />

      <div className="relative z-10 container mx-auto px-4 py-12 max-w-5xl">
        {/* Hero */}
        <section className="text-center mb-16">
          <div className="mb-4">
            <span className="text-[#00d4ff] font-mono text-sm tracking-widest uppercase">
              ◈ x402 PROTOCOL POWERED ◈
            </span>
          </div>
          <h1 className="font-header text-7xl md:text-9xl text-white mb-4 tracking-wider">
            WHALE INTENT
            <br />
            <span className="text-[#00d4ff]">DECODER</span>
          </h1>
          <p className="font-mono text-[#00d4ff] text-lg md:text-xl mb-8 opacity-80">
            $100K+の大口移動の「意図」をClaudeが推論する
          </p>
          <div className="inline-flex items-center gap-3 bg-[#1a3a5c]/50 border border-[#00d4ff]/30 rounded-full px-6 py-3 mb-8">
            <div className="w-2 h-2 bg-[#00d4ff] rounded-full animate-pulse" />
            <span className="font-mono text-sm text-[#00d4ff]">
              過去24時間の解析件数: <strong className="text-white">2,847</strong>
            </span>
          </div>

          <div className="mb-8">
            <ChainSelector selected={selectedChain} onSelect={setSelectedChain} />
          </div>

          <div className="inline-block bg-[#1a3a5c]/80 border border-[#00d4ff]/20 rounded-lg px-6 py-3">
            <span className="font-mono text-[#00d4ff] text-sm">
              💎 $0.30 / decode — USDC or JPYC
              <span className="text-white/50 ml-2">(SolanaはUSDCのみ)</span>
            </span>
          </div>
        </section>

        {/* Recent Decodes Feed */}
        <section>
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px flex-1 bg-[#00d4ff]/20" />
            <h2 className="font-header text-2xl text-[#00d4ff] tracking-widest">
              RECENT WHALE MOVEMENTS
            </h2>
            <div className="h-px flex-1 bg-[#00d4ff]/20" />
          </div>

          <div className="space-y-4">
            {MOCK_WHALE_DATA.filter(w => selectedChain === "base" ? w.chain !== "solana" && w.chain !== "polygon" : w.chain === selectedChain || selectedChain === "base").slice(0, 5).map((whale, index) => (
              <WhaleCard
                key={whale.txHash}
                whale={whale}
                index={index}
                onDecode={() => handleDecode(whale)}
              />
            ))}
          </div>
        </section>

        {/* Disclaimer */}
        <div className="mt-12 text-center">
          <p className="font-mono text-xs text-white/30">
            ⚠️ 推論結果は参考情報です。投資判断はご自身で行ってください。
          </p>
        </div>
      </div>

      {isModalOpen && selectedWhale && (
        <PaymentModal
          whale={selectedWhale}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </main>
  );
}
