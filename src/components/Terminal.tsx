"use client";

import { useState, useRef, useEffect, useCallback, useMemo, KeyboardEvent } from "react";
import {
  SLASH_COMMANDS,
  formatHelpText,
  type SlashCommand,
} from "@/lib/slash-commands";
import { SCENARIO_REQUEST, HANDOFF_REQUEST } from "@/lib/demo-scenario";
import { readSSE } from "@/lib/sse";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  prompt?: string;
}

export function Terminal({ mode = "fiction" }: { mode?: "fiction" | "support" }) {
  const support = mode === "support";
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      content:
        support
          ? "> SYNTHETIC SUPPORT DEMO\n> Request → supplied context → draft → human review\n> No telemetry, retrieval, tickets, or equipment actions.\n> Replay is a fixed sample, not an AI response."
          : "> MU/TH/UR 6000 ONLINE\n> FICTIONAL DEMO — NOT LIVE SHIP DATA\n> TYPE /help FOR AVAILABLE COMMANDS",
    },
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [hideSuggestions, setHideSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [offline, setOffline] = useState(true);
  const [accessToken, setAccessToken] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [hasScenario, setHasScenario] = useState(false);
  const commands: SlashCommand[] = useMemo(
    () => support ? SLASH_COMMANDS.filter((cmd) => cmd.clientAction) : SLASH_COMMANDS,
    [support],
  );
  const suggestions = useMemo(
    () => !hideSuggestions && input.startsWith("/") && !isProcessing
      ? commands.filter((cmd) => cmd.name.startsWith(input.toLowerCase()))
      : [],
    [commands, hideSuggestions, input, isProcessing],
  );

  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  // Focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, [isProcessing]);

  const executeCommand = useCallback(
    (commandText: string) => {
      const matched = commands.find(
        (cmd) => cmd.name === commandText.toLowerCase()
      );

      if (matched?.clientAction === "clear") {
        setMessages([
          {
            role: "system",
            content: support ? "> CONVERSATION RESET — SYNTHETIC SUPPORT DEMO\n> Load the sample request to begin." : "> TERMINAL CLEARED\n> MU/TH/UR 6000 READY\n> TYPE /help FOR AVAILABLE COMMANDS",
          },
        ]);
        setHasScenario(false);
        setReviewed(false);
        setCopyStatus("");
        setCommandHistory((prev) => [...prev, commandText]);
        setHistoryIndex(-1);
        setInput("");
        setHideSuggestions(true);
        return true;
      }

      if (matched?.clientAction === "help") {
        setMessages((prev) => [
          ...prev,
          { role: "system", content: support ? "> /help — available commands\n> /clear — reset conversation\n> Use the numbered demo controls to prepare a reviewed handoff." : formatHelpText() },
        ]);
        setCommandHistory((prev) => [...prev, commandText]);
        setHistoryIndex(-1);
        setInput("");
        setHideSuggestions(true);
        return true;
      }

      return false;
    },
    [commands, support]
  );

  const handleSubmit = useCallback(async (override?: string) => {
    const trimmed = (override ?? input).trim();
    if (!trimmed || busyRef.current) return;

    setHideSuggestions(true);

    // Handle client-side slash commands
    if (executeCommand(trimmed)) return;

    // Resolve slash command to its prompt expansion
    const matched = commands.find(
      (cmd) => cmd.name === trimmed.toLowerCase()
    );
    const queryText = matched?.prompt ?? trimmed;
    const displayText = matched ? `${trimmed}` : trimmed;

    const history = messages.filter((m) => m.role !== "system").map((m) => ({
      role: m.role,
      content: m.prompt ?? m.content,
    }));
    const payload = JSON.stringify({
      messages: [...history, { role: "user", content: queryText }],
      mode,
      offline: support && offline,
    });
    if (history.length >= 24 || queryText.length > 8000 || history.some((m) => m.content.length > 8000) ||
        history.reduce((sum, m) => sum + m.content.length, queryText.length) > 24000 ||
        new TextEncoder().encode(payload).length > 65536) {
      setMessages((prev) => [...prev, { role: "system", content: "> CONVERSATION LIMIT — use /clear, or shorten your query. Maximum 24 messages, 8,000 characters per message, 24,000 total." }]);
      return;
    }
    busyRef.current = true;
    const abort = new AbortController();
    abortRef.current = abort;
    const timeout = setTimeout(() => abort.abort(), 65_000);
    setReviewed(false);
    setCopyStatus("");
    if (queryText === SCENARIO_REQUEST) setHasScenario(true);

    // Add to history
    setCommandHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);

    // Add user message (show the slash command, not the expanded prompt)
    const userMessage: Message = { role: "user", content: displayText, prompt: queryText };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsProcessing(true);
    setStreamingContent("");

    try {
      const response = await fetch("/api/muthur", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: "Bearer " + accessToken } : {}),
        },
        body: payload,
        signal: abort.signal,
      });

      if (!response.ok) {
        const hints: Record<number, string> = {
          401: "Access denied. Enter the demo access token supplied by the host.",
          413: "Request too large. Clear the conversation or shorten the query.",
          429: "Demo is busy. Wait, then retry.",
          503: "Live service unavailable. Check host configuration or use synthetic replay.",
        };
        throw new Error(hints[response.status] ?? `REQUEST FAILED — STATUS ${response.status}`);
      }

      if (!response.body) throw new Error("STREAM INITIALIZATION FAILURE");
      const fullContent = await readSSE(response.body, setStreamingContent);

      // Finalize message
      if (fullContent) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: fullContent },
        ]);
      }
    } catch (error) {
      const errMsg =
        abort.signal.aborted ? "REQUEST STOPPED OR TIMED OUT — RETRY QUERY"
          : error instanceof Error ? error.message : "UNKNOWN SYSTEM FAULT";
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: `*** REQUEST NOT COMPLETED ***\n> ${errMsg}\n> RETRY QUERY OR CONTACT HOST\n> No incident or ticket was filed.`,
        },
      ]);
      setInput(trimmed);
    } finally {
      clearTimeout(timeout);
      abort.abort();
      abortRef.current = null;
      busyRef.current = false;
      setIsProcessing(false);
      setStreamingContent("");
    }
  }, [input, messages, executeCommand, commands, mode, support, offline, accessToken]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Autocomplete navigation
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestion((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestion((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        const cmd = suggestions[selectedSuggestion];
        if (cmd) {
          setInput(cmd.name);
          setHideSuggestions(true);
        }
        return;
      } else if (e.key === "Enter") {
        // Only autocomplete on Enter if the current input differs from the selected suggestion
        const cmd = suggestions[selectedSuggestion];
        if (cmd && input !== cmd.name) {
          e.preventDefault();
          setInput(cmd.name);
          setSuggestions([]);
          return;
        }
      }
      if (e.key === "Escape") {
        setHideSuggestions(true);
        return;
      }
    }

    if (e.key === "Enter") {
      handleSubmit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex =
          historyIndex === -1
            ? commandHistory.length - 1
            : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setInput("");
        } else {
          setHistoryIndex(newIndex);
          setInput(commandHistory[newIndex]);
        }
      }
    }
  };

  return (
    <div
      className="flex flex-1 flex-col overflow-hidden"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-[#1a4d1a] px-4 py-2">
        <span className="phosphor-text-dim text-xs tracking-[0.2em]">
          {support ? "STREAMING AI STARTER — SUPPORT HANDOFF" : "USCSS NOSTROMO — MU/TH/UR 6000 TERMINAL"}
        </span>
        <span className="phosphor-text-dim text-xs">
          {isProcessing ? "● PROCESSING" : "● READY"}
        </span>
      </div>
      <div className="border-b border-[#1a4d1a] p-3 text-sm space-y-2">
        <p className="phosphor-text-dim">
          {support ? "Synthetic data only. Drafts require human review; no actions are executed." : "Fictional entertainment demo. Clearance and logging text are not security or audit controls."}
        </p>
        {support && <>
          <label className="flex gap-2 items-center">
            <input type="checkbox" checked={offline} disabled={isProcessing}
              onChange={(e) => {
                setOffline(e.target.checked);
                setMessages([]);
                setHasScenario(false);
                setReviewed(false);
                setCopyStatus("");
                setInput("");
              }} />
            Synthetic replay (fixed sample, no AI; ignores free-form requests)
          </label>
          <div className="flex flex-wrap gap-2">
            <button className="demo-button" disabled={isProcessing} onClick={() => { setInput(SCENARIO_REQUEST); inputRef.current?.focus(); }}>1. Load synthetic request</button>
            <button className="demo-button" disabled={isProcessing || !hasScenario} onClick={() => handleSubmit(HANDOFF_REQUEST)}>2. Draft handoff</button>
          </div>
          <p>Load the request and press Enter to submit its context. Then draft, review, and copy the handoff.</p>
        </>}
        <label className="flex flex-wrap items-center gap-2">
          Demo access token (hosted access; kept only in memory)
          <input aria-label="Demo access token" className="bg-black border border-[#1a4d1a] px-2" type="password"
            autoComplete="off" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} />
        </label>
        <p className="phosphor-text-dim">{support && offline ? "REPLAY — not evidence of live model access" : "LIVE AI — external processing; do not submit sensitive data"}</p>
      </div>

      {/* Output area */}
      <div
        ref={outputRef}
        role="log"
        aria-label="Conversation"
        aria-live="polite"
        aria-busy={isProcessing}
        className="flex-1 overflow-y-auto p-4 font-[family-name:var(--font-terminal)] text-lg"
      >
        {messages.map((msg, i) => (
          <div key={i} className="mb-3">
            {msg.role === "user" ? (
              <div className="phosphor-text">
                <span className="text-[#66ff66]">{support ? "REQUEST" : "CREW"} &gt; </span>
                <span>{msg.content}</span>
              </div>
            ) : msg.role === "system" ? (
              <div className="phosphor-text-dim whitespace-pre-wrap text-sm">
                {msg.content}
              </div>
            ) : (
              <div className="phosphor-text whitespace-pre-wrap">
                <span className="phosphor-text-dim text-sm block mb-1">
                  {support ? (offline ? "REPLAY" : "ASSISTANT") : "MU/TH/UR"} &gt;
                </span>
                {msg.content}
              </div>
            )}
          </div>
        ))}

        {/* Streaming content */}
        {streamingContent && (
          <div className="mb-3 phosphor-text whitespace-pre-wrap">
            <span className="phosphor-text-dim text-sm block mb-1">
              {support ? (offline ? "REPLAY" : "ASSISTANT") : "MU/TH/UR"} &gt;
            </span>
            {streamingContent}
            <span className="cursor-blink">█</span>
          </div>
        )}
          {support && messages.some((m) => m.role === "assistant") && (
            <div className="border-t border-[#1a4d1a] p-3 text-sm">
              <label className="flex gap-2 items-center"><input type="checkbox" checked={reviewed} disabled={isProcessing}
                onChange={(e) => setReviewed(e.target.checked)} />I compared the draft with the supplied procedure. Human approval is still required.</label>
              <button className="demo-button mt-2" disabled={!reviewed || isProcessing} onClick={async () => {
                const last = [...messages].reverse().find((m) => m.role === "assistant");
                if (!last) return;
                try {
                  await navigator.clipboard.writeText(`DRAFT — HUMAN APPROVAL REQUIRED\n${last.content}`);
                  setCopyStatus("Copied draft for manual review. No ticket created.");
                } catch {
                  setCopyStatus("Clipboard unavailable. Select and copy the draft manually.");
                }
              }}>3. Copy for human review</button>
              <p role="status">{copyStatus}</p>
            </div>
          )}

        {/* Processing indicator */}
        {isProcessing && !streamingContent && (
          <div className="phosphor-text-dim text-sm animate-pulse">
            &gt; PROCESSING QUERY...
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="relative border-t border-[#1a4d1a] px-4 py-3">
        {/* Autocomplete dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 border border-[#1a4d1a] bg-black/95 px-1 py-1 font-[family-name:var(--font-terminal)]">
            {suggestions.map((cmd, i) => (
              <div
                key={cmd.name}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setInput(cmd.name);
                    setHideSuggestions(true);
                    inputRef.current?.focus();
                  }
                }}
                className={`flex items-center gap-3 px-3 py-1 text-sm cursor-pointer ${
                  i === selectedSuggestion
                    ? "bg-[#1a4d1a]/40 text-[#66ff66]"
                    : "text-[#33ff33]"
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setInput(cmd.name);
                  setHideSuggestions(true);
                  inputRef.current?.focus();
                }}
                onMouseEnter={() => setSelectedSuggestion(i)}
              >
                <span className="font-bold shrink-0">{cmd.name}</span>
                <span className="phosphor-text-dim text-xs truncate">
                  {cmd.description}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="phosphor-text text-base shrink-0">&gt;_</span>
          <input
            ref={inputRef}
            type="text"
            aria-label="Enter query"
            maxLength={8000}
            value={input}
            onChange={(e) => { setInput(e.target.value); setHideSuggestions(false); setSelectedSuggestion(0); }}
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
            placeholder={isProcessing ? "AWAITING RESPONSE..." : "ENTER QUERY"}
            className="min-w-0 flex-1 bg-transparent font-[family-name:var(--font-terminal)] text-lg text-[#33ff33] placeholder-[#55b855] outline-none caret-[#33ff33] disabled:opacity-50"
            autoComplete="off"
            spellCheck={false}
          />
          {isProcessing && <button className="demo-button" onClick={() => abortRef.current?.abort()}>Stop</button>}
        </div>
      </div>
    </div>
  );
}
