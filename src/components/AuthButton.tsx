"use client";

import { signIn, signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { LogIn, LogOut } from "lucide-react";

export function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="phosphor-text-dim text-xs animate-pulse">
        ● AUTHENTICATING...
      </div>
    );
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {session.user.image && (
            <img
              src={session.user.image}
              alt={session.user.name || "User"}
              className="h-5 w-5 rounded-sm border border-[#1a4d1a]"
            />
          )}
          <span className="phosphor-text-dim text-xs tracking-wide">
            CREW: {session.user.username || session.user.name}
          </span>
        </div>
        <button
          onClick={() => signOut()}
          className="phosphor-text-dim hover:text-[#66ff66] transition-colors text-xs flex items-center gap-1"
          title="Sign out"
        >
          <LogOut className="h-3 w-3" />
          LOGOUT
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("github")}
      className="phosphor-text-dim hover:text-[#66ff66] transition-colors text-xs flex items-center gap-1"
      title="Sign in with GitHub"
    >
      <LogIn className="h-3 w-3" />
      CREW LOGIN
    </button>
  );
}
