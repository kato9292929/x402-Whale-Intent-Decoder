"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export function WalletHeader() {
  return (
    <header className="relative z-20 flex items-center justify-between px-6 py-4 border-b border-[#00d4ff]/10">
      <div className="font-mono text-xs text-[#00d4ff]/60 tracking-widest">
        ◈ WHALE INTENT DECODER
      </div>
      <div className="flex items-center gap-3">
        <ConnectButton.Custom>
          {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
            const ready = mounted;
            const connected = ready && account && chain;
            return (
              <div>
                {!connected ? (
                  <button
                    onClick={openConnectModal}
                    className="px-4 py-2 border border-[#00d4ff]/40 text-[#00d4ff] font-mono text-xs rounded-lg
                      hover:bg-[#00d4ff]/10 transition-all"
                  >
                    EVM接続
                  </button>
                ) : (
                  <button
                    onClick={openAccountModal}
                    className="px-4 py-2 border border-[#00d4ff]/40 text-[#00d4ff] font-mono text-xs rounded-lg
                      hover:bg-[#00d4ff]/10 transition-all"
                  >
                    {account.displayName}
                  </button>
                )}
              </div>
            );
          }}
        </ConnectButton.Custom>
        <WalletMultiButton
          style={{
            background: "transparent",
            border: "1px solid rgba(0,212,255,0.4)",
            color: "#00d4ff",
            fontFamily: "Space Mono, monospace",
            fontSize: "12px",
            padding: "8px 16px",
            borderRadius: "8px",
            height: "auto",
          }}
        />
      </div>
    </header>
  );
}
