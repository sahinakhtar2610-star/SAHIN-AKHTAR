import React from "react";
import { BookOpen, Code2, Eye, Globe, Keyboard, Mic, Sparkles, X, Zap } from "lucide-react";

interface CapabilitiesModalProps {
  isOpen: boolean;
  initialTab: "capabilities" | "shortcuts";
  onClose: () => void;
}

export const CapabilitiesModal: React.FC<CapabilitiesModalProps> = ({
  isOpen,
  initialTab,
  onClose,
}) => {
  const [tab, setTab] = React.useState<"capabilities" | "shortcuts">(initialTab);

  React.useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="SAHIN AI Workspace Reference"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800/80">
            <button
              type="button"
              onClick={() => setTab("capabilities")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                tab === "capabilities"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              Capabilities
            </button>
            <button
              type="button"
              onClick={() => setTab("shortcuts")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                tab === "shortcuts"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              Keyboard Shortcuts
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {tab === "capabilities" ? (
          <div className="p-5 space-y-4 text-sm max-h-[70vh] overflow-y-auto">
            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-zinc-900 dark:text-zinc-100">
                  AI Image & Photo-to-Video Creation
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed mt-1">
                  Ask SAHIN AI to create photos and turn any photo into a motion video (e.g. &ldquo;ছবি তৈরি করো&rdquo; or &ldquo;ফটো থেকে ভিডিও বানাও&rdquo;). Generated creations carry the official SAHIN AI watermark and badge.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-teal-700 dark:text-teal-400 shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-zinc-900 dark:text-zinc-100">
                  Ultra-Fast Streaming & Low Latency
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed mt-1">
                  Powered by Gemini 3.8 Flash with low reasoning latency and immediate unbuffered Server-Sent Events, ensuring answers start appearing in milliseconds.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-teal-700 dark:text-teal-400 shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-zinc-900 dark:text-zinc-100">
                  Distraction-Free Reading Mode
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed mt-1">
                  Click Reading Mode in the header or press Alt+R to hide the sidebar and input area, giving you an uncluttered full-view of the entire conversation thread. Press Escape to exit.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-teal-700 dark:text-teal-400 shrink-0">
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-zinc-900 dark:text-zinc-100">
                  Voice-to-Text Dictation
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed mt-1">
                  Transcribe your voice into the chat prompt in real time using your browser&apos;s Web Speech API. Click the microphone icon or press Alt+V to start and stop dictation.
                </p>
              </div>
            </div>


            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-teal-700 dark:text-teal-400 shrink-0">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-zinc-900 dark:text-zinc-100">
                  Multimodal Vision & Image Input
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed mt-1">
                  Upload up to 4 images per prompt, drag and drop files anywhere onto the chat window, or paste screenshots directly from your clipboard (Ctrl+V / Cmd+V).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-teal-700 dark:text-teal-400 shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-zinc-900 dark:text-zinc-100">
                  Live Web Search Grounding
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed mt-1">
                  Toggle Web Search in the input bar to fetch current news, documentation, and real-time facts with verified source links attached below each response.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-teal-700 dark:text-teal-400 shrink-0">
                <Code2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-zinc-900 dark:text-zinc-100">
                  Streaming Markdown & Code Formatting
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed mt-1">
                  Real-time token streaming with GitHub-flavored Markdown tables, structured prose in English and Bengali, and one-click code copy blocks.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-2.5 text-xs max-h-[70vh] overflow-y-auto">
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-3">
              <Keyboard className="w-4 h-4 text-teal-700 dark:text-teal-400" />
              <span>Speed up your workflow with built-in shortcuts</span>
            </div>

            {[
              { label: "Send message", keys: "Enter" },
              { label: "Insert new line", keys: "Shift + Enter" },
              { label: "Toggle Reading Mode", keys: "Alt + R" },
              { label: "Exit Reading Mode", keys: "Escape" },
              { label: "Toggle Voice-to-Text Dictation", keys: "Alt + V" },
              { label: "Start new conversation", keys: "Ctrl / Cmd + K" },
              { label: "Toggle Web Search grounding", keys: "Ctrl / Cmd + /" },
              { label: "Paste screenshot from clipboard", keys: "Ctrl / Cmd + V" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/80 last:border-0"
              >
                <span className="text-zinc-700 dark:text-zinc-300 font-medium">{item.label}</span>
                <kbd className="font-mono text-[11px] px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                  {item.keys}
                </kbd>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

