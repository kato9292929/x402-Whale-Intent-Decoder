"use client";

import type { Chain } from "@/types";

interface ChainSelectorProps {
  selected: Chain;
  onSelect: (chain: Chain) => void;
}

const CHAINS: { id: Chain; label: string; icon: string }[] = [
  { id: "base", label: "Base", icon: "🔵" },
  { id: "polygon", label: "Polygon", icon: "🟣" },
  { id: "solana", label: "Solana", icon: "🟢" },
];

export function ChainSelector({ selected, onSelect }: ChainSelectorProps) {
  return (
    <div className="inline-flex bg-[#1a3a5c]/50 border border-[#00d4ff]/20 rounded-lg p-1">
      {CHAINS.map((chain) => (
        <button
          key={chain.id}
          onClick={() => onSelect(chain.id)}
          className={`
            px-6 py-2 rounded-md font-mono text-sm transition-all duration-200
            ${selected === chain.id
              ? "bg-[#00d4ff] text-[#040d1a] font-bold shadow-[0_0_20px_rgba(0,212,255,0.5)]"
              : "text-[#00d4ff]/70 hover:text-[#00d4ff] hover:bg-[#1a3a5c]"
            }
          `}
        >
          {chain.icon} {chain.label}
        </button>
      ))}
    </div>
  );
}
