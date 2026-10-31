import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  ExternalLink,
  Film,
  Globe,
  Maximize2,
  RotateCcw,
  Sparkles,
  Video,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { Attachment, ChatMessage } from "../types/chat";
import { BrandMark } from "./BrandMark";
import { MarkdownRenderer } from "./MarkdownRenderer";
import {
  speakAssistantText,
  stopAllSpeech,
  subscribeSpeechState,
} from "../utils/speechUtils";

interface ChatMessageItemProps {
  message: ChatMessage;
  isStreaming?: boolean;
  isLastAssistant?: boolean;
  onRegenerate?: () => void;
  onPreviewImage: (attachment: Attachment) => void;
  onRequestAnimateImage?: (imageUrl: string, prompt: string) => void;
}

function formatMessageTime(timestamp: number): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(timestamp));
  } catch {
    return "";
  }
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  isStreaming = false,
  isLastAssistant = false,
  onRegenerate,
  onPreviewImage,
  onRequestAnimateImage,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    return subscribeSpeechState((speakerId) => {
      setIsSpeaking(speakerId === message.id);
    });
  }, [message.id]);

  const handleToggleVoice = () => {
    if (isSpeaking) {
      stopAllSpeech();
    } else {
      speakAssistantText(message.id, message.content);
    }
  };

  const handleCopy = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  if (message.role === "user") {
    return (
      <div className="flex justify-end w-full group">
        <div className="max-w-[85%] sm:max-w-[75%] flex flex-col items-end gap-2">
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap justify-end gap-2">
              {message.attachments.map((att) => (
                <button
                  key={att.id}
                  type="button"
                  onClick={() => onPreviewImage(att)}
                  className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 hover:opacity-95 transition-opacity focus-visible:outline-2 focus-visible:outline-teal-600 cursor-pointer"
                  title={`Inspect ${att.name}`}
                >
                  <img
                    src={att.dataUrl}
                    alt={att.name}
                    referrerPolicy="no-referrer"
                    className="max-h-52 max-w-64 w-auto h-auto object-cover block"
                  />
                </button>
              ))}
            </div>
          )}

          {message.content.trim() && (
            <div className="rounded-2xl rounded-br-md px-4 py-3 bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-900 dark:text-zinc-100 text-[15px] leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity tabular-nums">
            <span>You</span>
            <span aria-hidden="true">·</span>
            <span>{formatMessageTime(message.createdAt)}</span>
            {message.content.trim() && (
              <>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Assistant Message (SAHIN AI)
  return (
    <div className="flex items-start gap-3.5 w-full group">
      <div className="pt-0.5 shrink-0">
        <BrandMark size="sm" />
      </div>

      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
          <span className="font-display font-semibold text-zinc-900 dark:text-zinc-100">
            SAHIN AI
          </span>
          <span aria-hidden="true">·</span>
          <span>{formatMessageTime(message.createdAt)}</span>
          {message.webSearchUsed && (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-400">
                <Globe className="w-3 h-3" />
                <span>Web Search</span>
              </span>
            </>
          )}
          {message.generatedImages && message.generatedImages.length > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-indigo-700 dark:text-indigo-400">
                <Sparkles className="w-3 h-3" />
                <span>AI Image</span>
              </span>
            </>
          )}
          {message.generatedVideos && message.generatedVideos.length > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-400">
                <Film className="w-3 h-3" />
                <span>AI Video</span>
              </span>
            </>
          )}
        </div>

        {message.isError ? (
          <div className="rounded-xl p-4 bg-red-50/80 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300 text-sm flex items-start gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <div className="space-y-2 flex-1">
              <p className="leading-relaxed">{message.content}</p>
              {onRegenerate && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 dark:text-red-300 underline underline-offset-3 hover:opacity-80 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Try again</span>
                </button>
              )}
            </div>
          </div>
        ) : !message.content && !message.generatedImages?.length && !message.generatedVideos?.length && isStreaming ? (
          <div className="py-2 space-y-2.5 max-w-lg" aria-label="SAHIN AI is thinking">
            <div className="h-3.5 w-3/4 rounded-md bg-zinc-200/80 dark:bg-zinc-800/80 animate-pulse" />
            <div className="h-3.5 w-1/2 rounded-md bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse" />
          </div>
        ) : (
          <MarkdownRenderer content={message.content} isStreaming={isStreaming} />
        )}

        {/* AI Generated Images Display */}
        {message.generatedImages && message.generatedImages.length > 0 && (
          <div className="space-y-3 pt-1">
            {message.generatedImages.map((genImg) => (
              <div
                key={genImg.id}
                className="group/img relative rounded-2xl overflow-hidden border border-zinc-200/90 dark:border-zinc-800 bg-zinc-900 dark:bg-zinc-950 shadow-md max-w-xl"
              >
                <div
                  className="relative cursor-pointer overflow-hidden bg-zinc-950"
                  onClick={() =>
                    onPreviewImage({
                      id: genImg.id,
                      name: `SAHIN_AI_${genImg.prompt.slice(0, 24).replace(/[^a-zA-Z0-9]/g, "_") || "image"}.jpg`,
                      mimeType: "image/jpeg",
                      dataUrl: genImg.url,
                    })
                  }
                >
                  <img
                    src={genImg.url}
                    alt={genImg.prompt}
                    referrerPolicy="no-referrer"
                    className="w-full h-auto object-cover max-h-[520px] transition-transform duration-300 group-hover/img:scale-[1.01]"
                  />

                  {/* Brand Watermark Badge Overlay */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-950/85 border border-white/20 backdrop-blur-md shadow-lg pointer-events-none select-none">
                    <img src="/logo.png" alt="SAHIN AI" className="w-4 h-4 object-contain" />
                    <span className="text-[11px] font-bold text-white tracking-wide">SAHIN AI</span>
                  </div>
                  
                  {/* Top-right overlay actions */}
                  <div className="absolute top-3 right-3 flex items-center gap-2 opacity-95 sm:opacity-0 group-hover/img:opacity-100 transition-opacity">
                    {onRequestAnimateImage && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRequestAnimateImage(genImg.url, genImg.prompt);
                        }}
                        className="p-2 rounded-xl bg-indigo-600/90 hover:bg-indigo-600 text-white backdrop-blur-md shadow cursor-pointer transition-colors"
                        title="Turn photo into video"
                        aria-label="Turn photo into video"
                      >
                        <Video className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreviewImage({
                          id: genImg.id,
                          name: `SAHIN_AI_${genImg.prompt.slice(0, 24).replace(/[^a-zA-Z0-9]/g, "_") || "image"}.jpg`,
                          mimeType: "image/jpeg",
                          dataUrl: genImg.url,
                        });
                      }}
                      className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-900 text-white backdrop-blur-md shadow cursor-pointer transition-colors"
                      title="Inspect full image"
                      aria-label="Inspect full image"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                    <a
                      href={genImg.url}
                      download={`sahin-ai-${genImg.prompt.slice(0, 24).replace(/[^a-zA-Z0-9]/g, "_") || "image"}.jpg`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white backdrop-blur-md shadow cursor-pointer transition-colors"
                      title="Download image file"
                      aria-label="Download image file"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Bottom info footer */}
                <div className="px-4 py-2.5 bg-zinc-900/95 border-t border-zinc-800/80 text-zinc-300 text-xs flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 min-w-0 max-w-[65%]">
                    <img src="/logo.png" alt="Logo" className="w-4 h-4 object-contain shrink-0" />
                    <span className="font-semibold text-zinc-200 text-xs shrink-0">SAHIN AI</span>
                    <span className="text-zinc-600">·</span>
                    <span className="truncate font-normal text-zinc-300">
                      &ldquo;{genImg.prompt}&rdquo;
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    {onRequestAnimateImage && (
                      <button
                        type="button"
                        onClick={() => onRequestAnimateImage(genImg.url, genImg.prompt)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600/25 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 text-[11px] font-semibold transition-colors cursor-pointer"
                        title="Generate video from this photo"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>ভিডিও বানাও</span>
                      </button>
                    )}
                    <a
                      href={genImg.url}
                      download={`sahin-ai-${genImg.prompt.slice(0, 24).replace(/[^a-zA-Z0-9]/g, "_") || "image"}.jpg`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-teal-600/25 hover:bg-teal-600/40 text-teal-300 text-[11px] font-semibold shrink-0 transition-colors cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI Generated Videos Display */}
        {message.generatedVideos && message.generatedVideos.length > 0 && (
          <div className="space-y-3 pt-1">
            {message.generatedVideos.map((video) => (
              <div
                key={video.id}
                className="group/vid relative rounded-2xl overflow-hidden border border-zinc-200/90 dark:border-zinc-800 bg-zinc-950 shadow-md max-w-xl"
              >
                <div className="relative overflow-hidden bg-black aspect-video flex items-center justify-center">
                  <video
                    src={video.url}
                    controls
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-contain"
                  />
                  
                  {/* Top-left Brand Watermark Badge Overlay */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-950/85 border border-white/20 backdrop-blur-md shadow-lg pointer-events-none select-none">
                    <img src="/logo.png" alt="SAHIN AI" className="w-4 h-4 object-contain" />
                    <span className="text-[11px] font-bold text-white tracking-wide">SAHIN AI · Video</span>
                  </div>
                </div>

                {/* Bottom Video Controls & Info */}
                <div className="px-4 py-2.5 bg-zinc-900/95 border-t border-zinc-800/80 text-zinc-300 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Film className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate font-medium text-zinc-200">
                      &ldquo;{video.prompt}&rdquo;
                    </span>
                  </div>
                  <a
                    href={video.url}
                    download={`sahin-ai-video-${video.prompt.slice(0, 24).replace(/[^a-zA-Z0-9]/g, "_") || "clip"}.webm`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold shrink-0 transition-colors shadow-sm cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Video</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}


        {/* Web Search Citations & Grounding Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="pt-3 mt-3 border-t border-zinc-200/80 dark:border-zinc-800/80 space-y-2">
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <Globe className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                Web Sources ({message.sources.length})
              </span>
              {message.searchQueries && message.searchQueries.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">
                    Searched: &ldquo;{message.searchQueries[0]}&rdquo;
                  </span>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {message.sources.map((src, idx) => (
                <a
                  key={`${src.uri}-${idx}`}
                  href={src.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 hover:border-teal-600/50 dark:hover:border-teal-500/50 hover:bg-zinc-100/70 dark:hover:bg-zinc-900 transition-colors text-xs group/link"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                      {src.title}
                    </p>
                    <p className="text-zinc-500 dark:text-zinc-400 truncate text-[11px]">
                      {src.domain}
                    </p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-400 group-hover/link:text-teal-600 dark:group-hover/link:text-teal-400 shrink-0 transition-colors" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Action Controls */}
        {!isStreaming && message.content && !message.isError && (
          <div className="flex items-center gap-2 pt-1 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 py-1 px-2 -ml-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>

            {/* Voice playback button */}
            <button
              type="button"
              onClick={handleToggleVoice}
              className={`inline-flex items-center gap-1.5 py-1 px-2 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isSpeaking
                  ? "bg-teal-500/15 text-teal-600 dark:text-teal-400 font-medium ring-1 ring-teal-500/30"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
              title={isSpeaking ? "Stop voice playback" : "Listen to this reply in voice"}
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>থামান / Stop</span>
                  <span className="flex items-end gap-0.5 h-3 ml-0.5">
                    <span className="w-0.5 h-3 bg-teal-500 animate-pulse rounded-full" />
                    <span className="w-0.5 h-1.5 bg-teal-500 animate-pulse delay-75 rounded-full" />
                    <span className="w-0.5 h-2.5 bg-teal-500 animate-pulse delay-150 rounded-full" />
                  </span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                  <span>ভয়েস শুনুন / Listen</span>
                </>
              )}
            </button>

            {isLastAssistant && onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                className="inline-flex items-center gap-1.5 py-1 px-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Regenerate</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
