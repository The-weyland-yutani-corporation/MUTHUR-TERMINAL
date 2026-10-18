"use client";

import { useState, useCallback } from "react";
import { CRTScreen } from "@/components/CRTScreen";
import { BootSequence } from "@/components/BootSequence";
import { Terminal } from "@/components/Terminal";

export default function Home() {
  const [booted, setBooted] = useState(false);
  const [support, setSupport] = useState(false);

  const handleBootComplete = useCallback(() => {
    setBooted(true);
  }, []);

  return (
    <CRTScreen neutral={support}>
      <nav aria-label="Demo experience" className="flex flex-wrap gap-3 border-b border-[#1a4d1a] p-3">
        <button className="demo-button" aria-pressed={support} onClick={() => { setSupport(true); setBooted(true); }}>
          Synthetic support demo
        </button>
        <button className="demo-button" aria-pressed={!support} onClick={() => { setSupport(false); setBooted(true); }}>
          Fictional terminal
        </button>
      </nav>
      {booted ? (
        <Terminal key={support ? "support" : "fiction"} mode={support ? "support" : "fiction"} />
      ) : (
        <BootSequence onComplete={handleBootComplete} />
      )}
    </CRTScreen>
  );
}
