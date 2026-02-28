"use client";

import { useState, useCallback } from "react";
import { CRTScreen } from "@/components/CRTScreen";
import { BootSequence } from "@/components/BootSequence";
import { Terminal } from "@/components/Terminal";

export default function Home() {
  const [booted, setBooted] = useState(false);

  const handleBootComplete = useCallback(() => {
    setBooted(true);
  }, []);

  return (
    <CRTScreen>
      {booted ? (
        <Terminal />
      ) : (
        <BootSequence onComplete={handleBootComplete} />
      )}
    </CRTScreen>
  );
}
