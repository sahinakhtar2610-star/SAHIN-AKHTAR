import React, { useState } from "react";
import {
  Bookmark,
  Check,
  Download,
  LogOut,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { Conversation, SidebarFilter } from "../types/chat";
import { BrandMark } from "./BrandMark";
import { useAuth } from "../context/AuthContext";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  filter: SidebarFilter;
  onFilterChange: (filter: SidebarFilter) => void;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onToggleSave: (id: string) => void;
  onRenameConversation: (id: string, nextTitle: string) => void;
  onDeleteConversation: (id: string) => void;
  onClearAllConversations: () => void;
  onExportActiveConversation: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

function formatRelativeDate(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(timestamp)
  );
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeId,
  filter,
  onFilterChange,
  onSelectConversation,
  onNewChat,
  onToggleSave,
  onRenameConversation,
  onDeleteConversation,
  onClearAllConversations,
  onExportActiveConversation,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const filteredConversations = conversations.filter((conv) => {
    if (filter === "saved" && !conv.saved) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    if (conv.title.toLowerCase().includes(q)) return true;
    return conv.messages.some((m) => m.content.toLowerCase().includes(q));
  });

  const savedCount = conversations.filter((c) => c.saved).length;
  const activeConversation = conversations.find((c) => c.id === activeId);

  const startEditing = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditDraft(conv.title);
    setConfirmDeleteId(null);
  };

  const commitEditing = (id: string) => {
    const trimmed = editDraft.trim();
    if (trimmed) {
      onRenameConversation(id, trimmed);
    }
    setEditingId(null);
  };

  const sidebarBody = (
    <aside className="flex flex-col h-full w-[276px] bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800/90 select-none">
      {/* Sidebar Top Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-zinc-200/80 dark:border-zinc-800/80 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <BrandMark size="sm" />
          <span className="font-display font-bold text-sm tracking-tight text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
            SAHIN AI
          </span>
        </div>

        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 cursor-pointer"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Primary New Chat Button + Search + Segmented Filter */}
      <div className="p-3 space-y-2.5 shrink-0">
        <button
          type="button"
          onClick={() => {
            onNewChat();
            onCloseMobile();
          }}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-teal-700 dark:bg-teal-500 text-white dark:text-zinc-950 font-medium text-sm hover:bg-teal-800 dark:hover:bg-teal-400 transition-colors cursor-pointer"
        >
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <Plus className="w-4 h-4 stroke-[2.4]" />
            <span>New Chat</span>
          </span>
          <span className="font-mono text-[11px] opacity-80 hidden sm:inline">Ctrl+K</span>
        </button>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            className="w-full h-9 pl-8 pr-7 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-teal-600 dark:focus:border-teal-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Segmented Filter Control: All vs Saved */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-zinc-200/70 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={() => onFilterChange("all")}
            className={`py-1.5 px-2.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer tabular-nums ${
              filter === "all"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            All Chats ({conversations.length})
          </button>
          <button
            type="button"
            onClick={() => onFilterChange("saved")}
            className={`py-1.5 px-2.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer tabular-nums ${
              filter === "saved"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            Saved ({savedCount})
          </button>
        </div>
      </div>

      {/* Conversation History List */}
      <div className="flex-1 overflow-y-auto px-2.5 py-1 space-y-1">
        {filteredConversations.length === 0 ? (
          <div className="px-3 py-8 text-center space-y-1.5">
            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {searchQuery
                ? "No matching conversations"
                : filter === "saved"
                ? "No saved conversations yet"
                : "No conversation history"}
            </p>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed">
              {filter === "saved"
                ? "Bookmark any conversation to keep it pinned here for quick access."
                : "Start a new chat to ask questions, inspect images, or search the web."}
            </p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = conv.id === activeId;
            const isEditing = editingId === conv.id;
            const isConfirmingDelete = confirmDeleteId === conv.id;

            return (
              <div
                key={conv.id}
                className={`group rounded-xl transition-colors ${
                  isActive
                    ? "bg-zinc-200/85 dark:bg-zinc-800/95 text-zinc-950 dark:text-zinc-50"
                    : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-zinc-900"
                }`}
              >
                {isEditing ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-2">
                    <input
                      type="text"
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEditing(conv.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      className="flex-1 min-w-0 px-2 py-1 rounded-md bg-white dark:bg-zinc-950 border border-teal-600 dark:border-teal-500 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => commitEditing(conv.id)}
                      className="p-1 text-teal-700 dark:text-teal-400 hover:opacity-80 cursor-pointer"
                      aria-label="Save title"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                      aria-label="Cancel rename"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : isConfirmingDelete ? (
                  <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                    <span className="text-red-700 dark:text-red-400 font-medium truncate">
                      Delete this chat?
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteConversation(conv.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-2 py-0.5 rounded bg-red-600 text-white font-medium hover:bg-red-700 cursor-pointer"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-0.5 rounded text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300/50 dark:hover:bg-zinc-800 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-2.5 py-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectConversation(conv.id);
                        onCloseMobile();
                      }}
                      className="flex items-start gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4 mt-0.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate leading-snug">{conv.title}</p>
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 tabular-nums mt-0.5">
                          {formatRelativeDate(conv.updatedAt)} · {conv.messages.length} msg
                        </p>
                      </div>
                    </button>

                    <div
                      className={`flex items-center gap-0.5 shrink-0 ${
                        conv.saved
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
                      } transition-opacity`}
                    >
                      <button
                        type="button"
                        onClick={() => onToggleSave(conv.id)}
                        className={`p-1 rounded-md transition-colors cursor-pointer ${
                          conv.saved
                            ? "text-teal-700 dark:text-teal-400"
                            : "text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                        }`}
                        title={conv.saved ? "Remove from Saved" : "Save conversation"}
                        aria-label={conv.saved ? "Remove from Saved" : "Save conversation"}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${conv.saved ? "fill-current" : ""}`} />
                      </button>

                      <button
                        type="button"
                        onClick={() => startEditing(conv)}
                        className="p-1 rounded-md text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                        title="Rename chat"
                        aria-label="Rename chat"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(conv.id)}
                        className="p-1 rounded-md text-zinc-400 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                        title="Delete chat"
                        aria-label="Delete chat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Sidebar Footer Actions */}
      <div className="p-3 border-t border-zinc-200/80 dark:border-zinc-800/80 space-y-1.5 shrink-0">
        {activeConversation && activeConversation.messages.length > 0 && (
          <button
            type="button"
            onClick={onExportActiveConversation}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-900 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Export Current Chat (.md)</span>
          </button>
        )}

        {conversations.length > 0 && (
          <>
            {confirmClearAll ? (
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-xs">
                <span className="text-red-700 dark:text-red-300 font-medium">Clear all history?</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      onClearAllConversations();
                      setConfirmClearAll(false);
                    }}
                    className="px-2 py-0.5 rounded bg-red-600 text-white font-medium hover:bg-red-700 cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(false)}
                    className="px-2 py-0.5 rounded text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClearAll(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-900 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>Clear All Conversations</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Gmail User Profile & Logout Section */}
      {user && (
        <div className="p-3 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-100/60 dark:bg-zinc-900/60 shrink-0">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="w-8 h-8 rounded-full border border-zinc-300 dark:border-zinc-700 object-cover shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {user.displayName || "Gmail User"}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                  {user.email}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
              title="Sign out of Gmail account"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );

  return (
    <>
      {/* Desktop Static Sidebar */}
      <div className="hidden lg:block h-full shrink-0">{sidebarBody}</div>

      {/* Mobile Slide-Over Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-[1px] transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{sidebarBody}</div>
        </div>
      )}
    </>
  );
};
