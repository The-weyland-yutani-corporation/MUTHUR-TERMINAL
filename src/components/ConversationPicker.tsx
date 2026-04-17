"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Plus, Trash2, FileText } from "lucide-react";

interface Conversation {
  id: string;
  title: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ConversationPickerProps {
  onSelectConversation: (id: string | null) => void;
  currentConversationId: string | null;
}

export function ConversationPicker({
  onSelectConversation,
  currentConversationId,
}: ConversationPickerProps) {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchConversations = () => {
      if (session?.user && isOpen) {
        loadConversations();
      }
    };

    fetchConversations();
  }, [session, isOpen]);

  const createNewConversation = async () => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `Session ${new Date().toISOString().split("T")[0]}` }),
      });

      if (res.ok) {
        const data = await res.json();
        await loadConversations();
        onSelectConversation(data.conversation.id);
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this session? This cannot be undone.")) return;

    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await loadConversations();
        if (currentConversationId === id) {
          onSelectConversation(null);
        }
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };

  if (!session?.user) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="phosphor-text-dim hover:text-[#66ff66] transition-colors text-xs flex items-center gap-1"
        title="Session Manager"
      >
        <FileText className="h-3 w-3" />
        SESSIONS
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-80 border border-[#1a4d1a] bg-black/95 z-20 max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-black border-b border-[#1a4d1a] p-2">
              <button
                onClick={createNewConversation}
                className="w-full phosphor-text hover:bg-[#1a4d1a]/40 px-3 py-2 text-sm flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                NEW SESSION
              </button>
            </div>

            {loading ? (
              <div className="phosphor-text-dim text-xs p-4 text-center">
                LOADING SESSIONS...
              </div>
            ) : conversations.length === 0 ? (
              <div className="phosphor-text-dim text-xs p-4 text-center">
                NO SAVED SESSIONS
              </div>
            ) : (
              <div className="p-1">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`flex items-center justify-between px-3 py-2 hover:bg-[#1a4d1a]/40 cursor-pointer ${
                      currentConversationId === conv.id
                        ? "bg-[#1a4d1a]/20 border-l-2 border-[#66ff66]"
                        : ""
                    }`}
                    onClick={() => {
                      onSelectConversation(conv.id);
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="phosphor-text text-sm truncate">
                        {conv.title || `Session ${conv.id.slice(0, 8)}`}
                      </div>
                      <div className="phosphor-text-dim text-xs">
                        {new Date(conv.updatedAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={(e) => deleteConversation(conv.id, e)}
                      className="phosphor-text-dim hover:text-red-500 transition-colors ml-2"
                      title="Delete session"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
