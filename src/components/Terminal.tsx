"use client";

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import {
  SLASH_COMMANDS,
  matchCommands,
  formatHelpText,
  type SlashCommand,
} from "@/lib/slash-commands";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export function Terminal() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      content:
        "> MU/TH/UR 6000 ONLINE\n> INTERFACE 2037 READY FOR INQUIRY\n> ENTER QUERY BELOW\n> TYPE /help FOR AVAILABLE COMMANDS",
    },
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<SlashCommand[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);

  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Update suggestions as user types
  useEffect(() => {
    if (input.startsWith("/") && !isProcessing) {
      const matches = matchCommands(input);
      setSuggestions(matches);
      setSelectedSuggestion(0);
    } else {
      setSuggestions([]);
    }
  }, [input, isProcessing]);

  const executeCommand = useCallback(
    (commandText: string) => {
      const matched = SLASH_COMMANDS.find(
        (cmd) => cmd.name === commandText.toLowerCase()
      );

      if (matched?.clientAction === "clear") {
        setMessages([
          {
            role: "system",
            content: "> TERMINAL CLEARED\n> MU/TH/UR 6000 READY\n> TYPE /help FOR AVAILABLE COMMANDS",
          },
        ]);
        setCommandHistory((prev) => [...prev, commandText]);
        setHistoryIndex(-1);
        setInput("");
        setSuggestions([]);
        return true;
      }

      if (matched?.clientAction === "help") {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: commandText },
          { role: "system", content: formatHelpText() },
        ]);
        setCommandHistory((prev) => [...prev, commandText]);
        setHistoryIndex(-1);
        setInput("");
        setSuggestions([]);
        return true;
      }

      return false;
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isProcessing) return;

    setSuggestions([]);

    // Handle client-side slash commands
    if (executeCommand(trimmed)) return;

    // Resolve slash command to its prompt expansion
    const matched = SLASH_COMMANDS.find(
      (cmd) => cmd.name === trimmed.toLowerCase()
    );
    const queryText = matched?.prompt ?? trimmed;
    const displayText = matched ? `${trimmed}` : trimmed;

    // Add to history
    setCommandHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);

    // Add user message (show the slash command, not the expanded prompt)
    const userMessage: Message = { role: "user", content: displayText };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsProcessing(true);
    setStreamingContent("");

    try {
      const response = await fetch("/api/muthur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...messages.filter((m) => m.role !== "system"),
            { role: "user", content: queryText },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`COMMUNICATIONS ERROR — STATUS ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("STREAM INITIALIZATION FAILURE");

      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                setStreamingContent(fullContent);
              }
              if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      }

      // Finalize message
      if (fullContent) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: fullContent },
        ]);
      }
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : "UNKNOWN SYSTEM FAULT";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `*** SYSTEM FAULT ***\n> ${errMsg}\n> RETRY QUERY OR CONTACT ENGINEERING\n> ERROR LOGGED — WEYLAND-YUTANI INCIDENT REPORT FILED`,
        },
      ]);
    } finally {
      setIsProcessing(false);
      setStreamingContent("");
    }
  }, [input, isProcessing, messages, executeCommand]);

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
      if (e.key === "Tab" || (e.key === "Enter" && input !== suggestions[selectedSuggestion]?.name)) {
        e.preventDefault();
        const cmd = suggestions[selectedSuggestion];
        if (cmd) {
          setInput(cmd.name);
          setSuggestions([]);
        }
        return;
      }
      if (e.key === "Escape") {
        setSuggestions([]);
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
      onClick={() => inputRef.current?.focus()}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-[#1a4d1a] px-4 py-2">
        <span className="phosphor-text-dim text-xs tracking-[0.2em]">
          USCSS NOSTROMO — MU/TH/UR 6000 TERMINAL
        </span>
        <span className="phosphor-text-dim text-xs">
          {isProcessing ? "● PROCESSING" : "● READY"}
        </span>
      </div>

      {/* Output area */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto p-4 font-[family-name:var(--font-terminal)] text-lg"
      >
        {messages.map((msg, i) => (
          <div key={i} className="mb-3">
            {msg.role === "user" ? (
              <div className="phosphor-text">
                <span className="text-[#66ff66]">CREW &gt; </span>
                <span>{msg.content}</span>
              </div>
            ) : msg.role === "system" ? (
              <div className="phosphor-text-dim whitespace-pre-wrap text-sm">
                {msg.content}
              </div>
            ) : (
              <div className="phosphor-text whitespace-pre-wrap">
                <span className="phosphor-text-dim text-sm block mb-1">
                  MU/TH/UR &gt;
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
              MU/TH/UR &gt;
            </span>
            {streamingContent}
            <span className="cursor-blink">█</span>
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
                className={`flex items-center gap-3 px-3 py-1 text-sm cursor-pointer ${
                  i === selectedSuggestion
                    ? "bg-[#1a4d1a]/40 text-[#66ff66]"
                    : "text-[#33ff33]"
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setInput(cmd.name);
                  setSuggestions([]);
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
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
            placeholder={isProcessing ? "AWAITING RESPONSE..." : "ENTER QUERY"}
            className="flex-1 bg-transparent font-[family-name:var(--font-terminal)] text-lg text-[#33ff33] placeholder-[#1a4d1a] outline-none caret-[#33ff33] disabled:opacity-50"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
