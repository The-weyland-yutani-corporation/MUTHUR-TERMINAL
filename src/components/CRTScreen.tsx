"use client";

import { ReactNode } from "react";

interface CRTScreenProps {
  children: ReactNode;
  neutral?: boolean;
}

export function CRTScreen({ children, neutral = false }: CRTScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020502] p-4">
      {/* CRT Monitor Frame */}
      <div className="relative w-full max-w-4xl">
        {/* Outer bezel */}
        <div className="rounded-2xl border-2 border-[#1a2e1a] bg-[#0a0f0a] p-3 shadow-[0_0_60px_rgba(51,255,51,0.08),inset_0_0_30px_rgba(0,0,0,0.5)]">
          {/* Inner screen area with CRT effects */}
          <div className="crt-screen rounded-lg bg-[#050a05] overflow-hidden">
            {/* Screen content */}
            <div className="relative z-0 h-[85vh] min-h-[32rem] flex flex-col">
              {children}
            </div>
          </div>
        </div>

        {/* Monitor base label */}
        <div className="mt-3 flex items-center justify-between px-4">
          <span className="phosphor-text-dim text-xs tracking-[0.3em] uppercase">
            {neutral ? "Streaming AI Starter" : "Weyland-Yutani Corp."}
          </span>
          <span className="phosphor-text-dim text-xs tracking-[0.2em]">
            {neutral ? "Synthetic data only" : "MU/TH/UR 6000"}
          </span>
          <span className="phosphor-text-dim text-xs tracking-[0.3em] uppercase">
            {neutral ? "Human review required" : "Interface 2037"}
          </span>
        </div>
      </div>
    </div>
  );
}
