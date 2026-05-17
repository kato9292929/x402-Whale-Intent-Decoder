"use client";

import type { WhaleMovement, IntentType } from "@/types";

interface WhaleCardProps {
  whale: WhaleMovement;
  index: number;
  onDecode: () => void;
}

const INTENT_CONFIG: Record<IntentType, { label: string; color: string; bg: string; emoji: string }> = {
  EXIT_PREPARATION: { label: "EXIT_PREPARATION", color: "#ff4444", bg: "rgba(255,68,68,0.15)", emoji: "🔴" },
  POSITION_BUILDING: { label: "POSITION_BUILDING", color: "#ffd700", bg: "rgba(255,215,0,0.15)", emoji: "🟡" },
  BRIDGE: { label: "BRIDGE", color: "#4488ff", bg: "rgba(68,136,255,0.15)", emoji: "🔵" },
  ACCUMULATION: { label: "ACCUMULATION", color: "#44ff88", bg: "rgba(68,255,136,0.15)", emoji: "🟢" },
  UNKNOWN: { label: "UNKNOWN", color: "#aaaaaa", bg: "rgba(170,170,170,0.15)", emoji: "⚪" },
};

const WHALE_SIZE_CONFIG = {
  small: { size: "w-8 h-8 text-lg" },
  medium: { size: "w-10 h-10 text-xl" },
  large: { size: "w-12 h-12 text-2xl" },
};

const CHAIN_CONFIG = {
  base: { label: "Base", color: "#0052ff", bg: "rgba(0,82,255,0.2)" },
  polygon: { label: "Polygon", color: "#8247e5", bg: "rgba(130,71,229,0.2)" },
  solana: { label: "Solana", color: "#9945ff", bg: "rgba(153,69,255,0.2)" },
};

function truncateAddress(addr: string) {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatUsd(amount: number) {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const isLow = pct < 60;
  const isMid = pct >= 60 && pct < 80;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#040d1a] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: isLow
              ? "repeating-linear-gradient(45deg, #aaa, #aaa 2px, transparent 2px, transparent 6px)"
              : isMid
              ? "rgba(0,212,255,0.6)"
              : "#00d4ff",
          }}
        />
      </div>
      <span className="font-mono text-xs text-white/50">
        {pct}%{isLow && <span className="text-yellow-400 ml-1">低確信度</span>}
      </span>
    </div>
  );
}

const ANIM_CLASSES = [
  "animate-fade-in-1",
  "animate-fade-in-2",
  "animate-fade-in-3",
  "animate-fade-in-4",
  "animate-fade-in-5",
];

export function WhaleCard({ whale, index, onDecode }: WhaleCardProps) {
  const intent = whale.intent || "UNKNOWN";
  const intentCfg = INTENT_CONFIG[intent];
  const whaleCfg = WHALE_SIZE_CONFIG[whale.whaleSize];
  const chainCfg = CHAIN_CONFIG[whale.chain];
  const animClass = `opacity-0 ${ANIM_CLASSES[Math.min(index, 4)]}`;

  return (
    <div
      className={`${animClass} bg-[#1a3a5c]/60 border border-[#00d4ff]/10 rounded-xl p-4
        hover:border-[#00d4ff]/40 hover:bg-[#1a3a5c]/80 transition-all duration-300
        hover:shadow-[0_0_30px_rgba(0,212,255,0.1)]`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div
          className={`${whaleCfg.size} flex items-center justify-center rounded-full
            bg-[#00d4ff]/10 border border-[#00d4ff]/30 flex-shrink-0`}
        >
          🐋
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-mono text-sm text-[#00d4ff]">
              {truncateAddress(whale.walletAddress)}
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-mono"
              style={{ color: chainCfg.color, background: chainCfg.bg }}
            >
              {chainCfg.label}
            </span>
            <span className="font-mono text-white font-bold">
              {formatUsd(whale.amountUsd)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-mono text-xs text-white/50">{whale.fromLabel}</span>
            <span className="text-[#00d4ff]/50">→</span>
            <span className="font-mono text-xs text-white/50">{whale.toLabel}</span>
          </div>

          {whale.confidence !== undefined && (
            <ConfidenceBar confidence={whale.confidence} />
          )}
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold"
            style={{
              color: intentCfg.color,
              background: intentCfg.bg,
              border: `1px solid ${intentCfg.color}40`,
            }}
          >
            {intentCfg.emoji} {intentCfg.label}
          </div>
          <button
            onClick={onDecode}
            className="px-4 py-2 bg-[#00d4ff]/10 border border-[#00d4ff]/40 text-[#00d4ff]
              rounded-lg text-xs font-mono hover:bg-[#00d4ff] hover:text-[#040d1a]
              transition-all duration-200 hover:shadow-[0_0_20px_rgba(0,212,255,0.4)]"
          >
            この移動を詳細解析 →
          </button>
        </div>
      </div>
    </div>
  );
}
