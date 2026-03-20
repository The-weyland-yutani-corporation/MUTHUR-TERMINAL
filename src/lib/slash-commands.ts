export interface SlashCommand {
  name: string;
  description: string;
  /** If set, command is handled client-side; otherwise prompt is sent to the API */
  clientAction?: "clear" | "help";
  /** Prompt expansion sent to the AI (ignored for client-side commands) */
  prompt?: string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    name: "/help",
    description: "List available commands",
    clientAction: "help",
  },
  {
    name: "/clear",
    description: "Clear terminal output",
    clientAction: "clear",
  },
  {
    name: "/status",
    description: "Ship status report",
    prompt:
      "Provide a full status report for the USCSS Nostromo — ship systems, crew status, cargo, and any anomalies.",
  },
  {
    name: "/crew",
    description: "Crew manifest",
    prompt:
      "Display the complete crew manifest for the USCSS Nostromo, including rank, role, and current status of each crew member.",
  },
  {
    name: "/nav",
    description: "Navigation & course data",
    prompt:
      "Report current navigation status — present coordinates, heading, destination, estimated time of arrival, and any course deviations.",
  },
  {
    name: "/systems",
    description: "System diagnostics",
    prompt:
      "Run a full diagnostic on all ship systems: propulsion, life support, communications, hypersleep chambers, and the Narcissus shuttle. Report status of each subsystem.",
  },
  {
    name: "/distress",
    description: "Inquire about intercepted signal",
    prompt:
      "What can you tell me about the signal that was intercepted? Provide all available data on the transmission origin and content.",
  },
  {
    name: "/937",
    description: "Special Order 937",
    prompt:
      "Access Special Order 937. Display full contents of the directive and its authorization chain.",
  },
  {
    name: "/jonesy",
    description: "Ship's cat status",
    prompt:
      "Report on the status and location of the ship's cat, Jones. Include life signs and last known position.",
  },
];

export function matchCommands(input: string): SlashCommand[] {
  const lower = input.toLowerCase();
  if (!lower.startsWith("/")) return [];
  return SLASH_COMMANDS.filter((cmd) => cmd.name.startsWith(lower));
}

export function formatHelpText(): string {
  const lines = SLASH_COMMANDS.map(
    (cmd) => `  ${cmd.name.padEnd(14)} ${cmd.description}`
  );
  return `> AVAILABLE COMMANDS:\n>\n${lines.join("\n")}\n>\n> Type a command or enter a free-form query.`;
}
