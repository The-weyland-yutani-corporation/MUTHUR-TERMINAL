"use client";

import { useState, useEffect } from "react";

const WEYLAND_YUTANI_LOGO = [
  "██╗    ██╗███████╗██╗   ██╗██╗      █████╗ ███╗   ██╗██████╗",
  "██║    ██║██╔════╝╚██╗ ██╔╝██║     ██╔══██╗████╗  ██║██╔══██╗",
  "██║ █╗ ██║█████╗   ╚████╔╝ ██║     ███████║██╔██╗ ██║██║  ██║",
  "██║███╗██║██╔══╝    ╚██╔╝  ██║     ██╔══██║██║╚██╗██║██║  ██║",
  "╚███╔███╔╝███████╗   ██║   ███████╗██║  ██║██║ ╚████║██████╔╝",
  " ╚══╝╚══╝ ╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝",
  "",
  "    ██╗   ██╗██╗   ██╗████████╗ █████╗ ███╗   ██╗██╗",
  "    ╚██╗ ██╔╝██║   ██║╚══██╔══╝██╔══██╗████╗  ██║██║",
  "     ╚████╔╝ ██║   ██║   ██║   ███████║██╔██╗ ██║██║",
  "      ╚██╔╝  ██║   ██║   ██║   ██╔══██║██║╚██╗██║██║",
  "       ██║   ╚██████╔╝   ██║   ██║  ██║██║ ╚████║██║",
  "       ╚═╝    ╚═════╝    ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝",
];

const BOOT_MESSAGES = [
  { text: "", delay: 200 },
  { text: '         "BUILDING BETTER WORLDS"', delay: 800 },
  { text: "", delay: 400 },
  { text: "═══════════════════════════════════════════════════════════", delay: 200 },
  { text: "", delay: 300 },
  { text: "> INITIALIZING MU/TH/UR 6000 MAINFRAME...", delay: 600 },
  { text: "> BIOS CHECK .......................... OK", delay: 400 },
  { text: "> MEMORY TEST: 2.1 TB ................. OK", delay: 350 },
  { text: "> NEURAL NET PROCESSORS ............... ONLINE", delay: 300 },
  { text: "> CORE LANGUAGE MATRIX ................ LOADED", delay: 250 },
  { text: "> NAVIGATION SUBSYSTEM ................ STANDBY", delay: 200 },
  { text: "> LIFE SUPPORT MONITORING ............. ACTIVE", delay: 200 },
  { text: "> HYPERSLEEP VAULT INTERFACE .......... CONNECTED", delay: 200 },
  { text: "> COMMS RELAY (DEEP SPACE) ............ NOMINAL", delay: 200 },
  { text: "> SCIENCE STATION UPLINK .............. SYNCED", delay: 200 },
  { text: "", delay: 300 },
  { text: "═══════════════════════════════════════════════════════════", delay: 200 },
  { text: "", delay: 200 },
  { text: "  VESSEL:       USCSS NOSTROMO  REG. 180924609", delay: 150 },
  { text: "  CLASS:        LOCKMART CM-88B BISON M-CLASS", delay: 150 },
  { text: "  CREW:         7 REGISTERED  |  1 NON-HUMAN (FELINE)", delay: 150 },
  { text: "  CARGO:        20,000,000 TONS MINERAL ORE", delay: 150 },
  { text: "  DESTINATION:  EARTH (SOL SYSTEM)", delay: 150 },
  { text: "  STATUS:       RETURN VOYAGE FROM THEDUS", delay: 150 },
  { text: "", delay: 300 },
  { text: "═══════════════════════════════════════════════════════════", delay: 200 },
  { text: "", delay: 400 },
  { text: "*** ALL SYSTEMS NOMINAL ***", delay: 500 },
  { text: "*** WEYLAND-YUTANI CORPORATE DIRECTIVE ACTIVE ***", delay: 400 },
  { text: "", delay: 300 },
  { text: "> INTERFACE 2037 READY FOR INQUIRY", delay: 600 },
  { text: "> CREW IDENTIFICATION: GUEST ACCESS GRANTED", delay: 400 },
  { text: "> ALL INTERACTIONS LOGGED — PROPERTY OF WEYLAND-YUTANI CORP.", delay: 300 },
  { text: "", delay: 200 },
];

interface BootSequenceProps {
  onComplete: () => void;
}

export function BootSequence({ onComplete }: BootSequenceProps) {
  const [displayedLogo, setDisplayedLogo] = useState<string[]>([]);
  const [displayedMessages, setDisplayedMessages] = useState<string[]>([]);
  const [phase, setPhase] = useState<"logo" | "messages" | "done">("logo");

  // Phase 1: Show logo lines one by one
  useEffect(() => {
    if (phase !== "logo") return;

    let lineIndex = 0;
    const interval = setInterval(() => {
      if (lineIndex < WEYLAND_YUTANI_LOGO.length) {
        setDisplayedLogo((prev) => [...prev, WEYLAND_YUTANI_LOGO[lineIndex]]);
        lineIndex++;
      } else {
        clearInterval(interval);
        setTimeout(() => setPhase("messages"), 500);
      }
    }, 60);

    return () => clearInterval(interval);
  }, [phase]);

  // Phase 2: Show boot messages with individual delays
  useEffect(() => {
    if (phase !== "messages") return;

    let msgIndex = 0;
    let timeoutId: NodeJS.Timeout;

    const showNext = () => {
      if (msgIndex < BOOT_MESSAGES.length) {
        const msg = BOOT_MESSAGES[msgIndex];
        setDisplayedMessages((prev) => [...prev, msg.text]);
        msgIndex++;
        timeoutId = setTimeout(showNext, msg.delay);
      } else {
        setTimeout(() => {
          setPhase("done");
          onComplete();
        }, 800);
      }
    };

    showNext();
    return () => clearTimeout(timeoutId);
  }, [phase, onComplete]);

  return (
    <div className="flex-1 overflow-y-auto p-6 font-[family-name:var(--font-terminal)] text-lg leading-relaxed">
      {/* Logo */}
      <div className="phosphor-text mb-2">
        {displayedLogo.map((line, i) => (
          <div key={`logo-${i}`} className="boot-line text-[10px] sm:text-xs leading-none whitespace-pre">
            {line}
          </div>
        ))}
      </div>

      {/* Boot messages */}
      <div className="phosphor-text">
        {displayedMessages.map((msg, i) => (
          <div
            key={`msg-${i}`}
            className={`boot-line text-sm sm:text-base ${
              msg.startsWith("***") ? "text-[#66ff66] font-bold" : ""
            } ${msg.startsWith(">") ? "text-[#33ff33]" : "phosphor-text-dim"} ${
              msg.startsWith("═") ? "phosphor-text-dim" : ""
            }`}
          >
            {msg}
          </div>
        ))}
      </div>

      {/* Blinking cursor during boot */}
      {phase !== "done" && (
        <span className="cursor-blink phosphor-text text-base">█</span>
      )}
    </div>
  );
}
