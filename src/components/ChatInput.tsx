import React, { useEffect, useRef, useState } from "react";
import { ArrowUp, Film, Globe, ImagePlus, Mic, MicOff, Sparkles, Square, Volume2, X } from "lucide-react";
import type { Attachment } from "../types/chat";
import { processImageFile } from "../utils/imageUtils";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  attachments: Attachment[];
  onAddAttachments: (items: Attachment[]) => void;
  onRemoveAttachment: (id: string) => void;
  onPreviewAttachment: (att: Attachment) => void;
  webSearchEnabled: boolean;
  onToggleWebSearch: () => void;
  imageGenMode?: boolean;
  onToggleImageGen?: () => void;
  videoGenMode?: boolean;
  onToggleVideoGen?: () => void;
  voiceAutoSpeak?: boolean;
  onToggleVoiceAutoSpeak?: () => void;
  isStreaming: boolean;
  onSend: () => void;
  onStop: () => void;
}


// Browser Web Speech API type declarations
type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  attachments,
  onAddAttachments,
  onRemoveAttachment,
  onPreviewAttachment,
  webSearchEnabled,
  onToggleWebSearch,
  imageGenMode = false,
  onToggleImageGen,
  videoGenMode = false,
  onToggleVideoGen,
  voiceAutoSpeak = false,
  onToggleVoiceAutoSpeak,
  isStreaming,
  onSend,
  onStop,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const baseTextRef = useRef<string>("");

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Auto-resize textarea smoothly
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const nextHeight = Math.min(el.scrollHeight, 200);
    el.style.height = `${Math.max(nextHeight, 44)}px`;
  }, [value]);

  // Clean up speech recognition on unmount or when streaming begins
  useEffect(() => {
    if (isStreaming && isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
  }, [isStreaming, isListening]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop error
      }
    }
    setIsListening(false);
  };

  const startVoiceRecognition = () => {
    const SpeechConstructor = getSpeechRecognitionConstructor();
    if (!SpeechConstructor) {
      setSpeechError(
        "Voice-to-Text is not supported by your current browser. Please try Google Chrome, Edge, or Safari."
      );
      return;
    }

    setSpeechError(null);
    baseTextRef.current = value;

    try {
      const recognition = new SpeechConstructor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang =
        typeof navigator !== "undefined" && navigator.language
          ? navigator.language
          : "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let finalPart = "";
        let interimPart = "";

        for (let i = 0; i < event.results.length; i += 1) {
          const item = event.results[i];
          const transcript = item[0]?.transcript || "";
          if (item.isFinal) {
            finalPart += `${transcript} `;
          } else {
            interimPart += transcript;
          }
        }

        const spoken = `${finalPart}${interimPart}`.trim();
        const base = baseTextRef.current.trim();
        const combined = base ? `${base} ${spoken}` : spoken;

        onChange(combined);
      };

      recognition.onerror = (event: any) => {
        const errType = event?.error;
        if (errType === "not-allowed" || errType === "service-not-allowed") {
          setSpeechError(
            "Microphone permission was denied. Please allow microphone access in your browser."
          );
        } else if (errType === "audio-capture") {
          setSpeechError("No microphone found. Please connect a microphone and try again.");
        } else if (errType === "network") {
          setSpeechError("Network error during speech recognition. Please check your internet connection.");
        } else if (errType !== "no-speech") {
          setSpeechError(`Voice input error: ${errType || "Unable to transcribe speech"}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err: unknown) {
      setSpeechError(
        err instanceof Error ? err.message : "Failed to initialize microphone recording."
      );
      setIsListening(false);
    }
  };

  const handleToggleVoice = () => {
    if (isListening) {
      stopVoiceRecognition();
    } else {
      startVoiceRecognition();
    }
  };

  // Keyboard shortcut: Alt+V to toggle Voice-to-Text
  useEffect(() => {
    const handleKeyDownGlobal = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        handleToggleVoice();
      }
    };
    window.addEventListener("keydown", handleKeyDownGlobal);
    return () => window.removeEventListener("keydown", handleKeyDownGlobal);
  }, [isListening, value]);

  const handleFiles = async (fileList: File[] | FileList) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setUploadError(null);
    setIsProcessingFiles(true);

    try {
      const remainingSlots = Math.max(0, 4 - attachments.length);
      if (remainingSlots === 0) {
        setUploadError("Maximum of 4 images per message reached.");
        return;
      }

      const toProcess = files.slice(0, remainingSlots);
      const processed: Attachment[] = [];

      for (const file of toProcess) {
        const item = await processImageFile(file);
        processed.push(item);
      }

      if (processed.length > 0) {
        onAddAttachments(processed);
      }
      if (files.length > remainingSlots) {
        setUploadError("Only the first 4 images were attached.");
      }
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Could not process image.");
    } finally {
      setIsProcessingFiles(false);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleFiles(e.target.files);
      e.target.value = "";
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      await handleFiles(imageFiles);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && (value.trim() || attachments.length > 0) && !isProcessingFiles) {
        if (isListening) {
          stopVoiceRecognition();
        }
        onSend();
      }
    }
  };

  const handleSendClick = () => {
    if (isListening) {
      stopVoiceRecognition();
    }
    onSend();
  };

  const canSend = (value.trim().length > 0 || attachments.length > 0) && !isProcessingFiles;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4 pt-2">
      {/* Upload or Speech Error Alerts */}
      {(uploadError || speechError) && (
        <div className="mb-2 px-3.5 py-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-center justify-between gap-2">
          <span>{uploadError || speechError}</span>
          <button
            type="button"
            onClick={() => {
              setUploadError(null);
              setSpeechError(null);
            }}
            className="p-0.5 hover:opacity-75 cursor-pointer"
            aria-label="Dismiss error message"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div
        className={`rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm transition-colors ${
          isListening
            ? "border-rose-500/80 dark:border-rose-500/80 ring-2 ring-rose-500/10"
            : imageGenMode
            ? "border-indigo-500/80 dark:border-indigo-500/80 ring-2 ring-indigo-500/10"
            : "border-zinc-300/90 dark:border-zinc-700/90 focus-within:border-teal-600 dark:focus-within:border-teal-500"
        }`}
      >
        {/* Attached Image Preview Strip */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap items-center gap-2.5 px-3.5 pt-3.5 pb-1">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="relative group/thumb w-16 h-16 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 shrink-0"
              >
                <button
                  type="button"
                  onClick={() => onPreviewAttachment(att)}
                  className="w-full h-full block cursor-pointer"
                  title={`Preview ${att.name}`}
                >
                  <img
                    src={att.dataUrl}
                    alt={att.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveAttachment(att.id)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-zinc-900/85 text-white flex items-center justify-center hover:bg-zinc-950 transition-colors cursor-pointer"
                  aria-label={`Remove ${att.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Auto-Resizing Textarea */}
        <div className="px-3.5 pt-3 pb-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            rows={1}
            placeholder={
              isListening
                ? "Listening... Speak clearly to transcribe into your prompt."
                : imageGenMode
                ? "Describe the image you want SAHIN A AI to create (e.g. 'Futuristic city' or 'একটি সুন্দর পাখির ছবি')..."
                : webSearchEnabled
                ? "Ask SAHIN A AI anything or search the live web..."
                : "Message SAHIN A AI, speak via microphone, or ask to create an image..."
            }
            className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none max-h-[200px]"
            aria-label="Chat message input"
          />
        </div>

        {/* Live Audio Recording Bar */}
        {isListening && (
          <div className="flex items-center justify-between px-3.5 py-1.5 bg-rose-50/80 dark:bg-rose-950/40 border-t border-rose-200/60 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600 dark:bg-rose-400" />
              </span>
              <span className="font-medium">Voice-to-Text active: Speak now to transcribe</span>
            </div>
            <button
              type="button"
              onClick={stopVoiceRecognition}
              className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-100 dark:bg-rose-900/60 hover:bg-rose-200 dark:hover:bg-rose-800 text-rose-800 dark:text-rose-200 transition-colors cursor-pointer"
            >
              Done Speaking
            </button>
          </div>
        )}

        {/* Bottom Controls Bar */}
        <div className="flex items-center justify-between gap-2 px-3 pb-2.5 pt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
            />

            {/* Image Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming || isProcessingFiles}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Upload, drag & drop, or paste images (PNG, JPEG, WEBP, GIF)"
            >
              <ImagePlus className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">
                {isProcessingFiles ? "Processing..." : "Attach Image"}
              </span>
            </button>

            {/* Voice-to-Text Microphone Button */}
            <button
              type="button"
              onClick={handleToggleVoice}
              disabled={isStreaming || isProcessingFiles}
              aria-pressed={isListening}
              className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                isListening
                  ? "bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800"
                  : "bg-transparent text-zinc-600 dark:text-zinc-300 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
              title={
                isListening
                  ? "Stop voice recording (or press Alt+V)"
                  : "Voice-to-Text: Click to record and transcribe your voice (Alt+V)"
              }
              aria-label={isListening ? "Stop voice recording" : "Record voice to text"}
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>Stop Dictation</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Voice</span>
                </>
              )}
            </button>

            {/* Web Search Toggle Button */}
            <button
              type="button"
              onClick={onToggleWebSearch}
              aria-pressed={webSearchEnabled}
              className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                webSearchEnabled
                  ? "bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-800"
                  : "bg-transparent text-zinc-600 dark:text-zinc-300 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
              title="Toggle live Google Search grounding"
            >
              <Globe
                className={`w-4 h-4 shrink-0 ${
                  webSearchEnabled ? "text-teal-700 dark:text-teal-400" : ""
                }`}
              />
              <span>{webSearchEnabled ? "Web Search: On" : "Web Search"}</span>
            </button>

            {/* Create Image Mode Toggle Button */}
            {onToggleImageGen && (
              <button
                type="button"
                onClick={onToggleImageGen}
                aria-pressed={imageGenMode}
                className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                  imageGenMode
                    ? "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800 font-semibold"
                    : "bg-transparent text-zinc-600 dark:text-zinc-300 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
                title="Create 4K AI images from your descriptions (e.g., 'ছবি আঁকো')"
              >
                <Sparkles
                  className={`w-4 h-4 shrink-0 ${
                    imageGenMode ? "text-indigo-600 dark:text-indigo-400" : ""
                  }`}
                />
                <span>{imageGenMode ? "Image: On" : "Image"}</span>
              </button>
            )}

            {/* AI Video Mode Toggle Button */}
            {onToggleVideoGen && (
              <button
                type="button"
                onClick={onToggleVideoGen}
                aria-pressed={videoGenMode}
                className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                  videoGenMode
                    ? "bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-800 font-semibold shadow-sm"
                    : "bg-transparent text-zinc-600 dark:text-zinc-300 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
                title="Create 4K cinematic motion video from photo or text description"
              >
                <Film
                  className={`w-4 h-4 shrink-0 ${
                    videoGenMode ? "text-teal-600 dark:text-teal-400" : ""
                  }`}
                />
                <span>{videoGenMode ? "Video: On" : "Video"}</span>
              </button>
            )}

            {/* Voice Output Toggle Button */}
            {onToggleVoiceAutoSpeak && (
              <button
                type="button"
                onClick={onToggleVoiceAutoSpeak}
                aria-pressed={voiceAutoSpeak}
                className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                  voiceAutoSpeak
                    ? "bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800 font-semibold shadow-sm"
                    : "bg-transparent text-zinc-600 dark:text-zinc-300 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
                title="Voice Mode: SAHIN AI will speak out answers aloud"
              >
                <Volume2
                  className={`w-4 h-4 shrink-0 ${
                    voiceAutoSpeak ? "text-purple-600 dark:text-purple-400" : ""
                  }`}
                />
                <span>{voiceAutoSpeak ? "Voice Out: On" : "Voice Out"}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
                aria-label="Stop generating response"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSendClick}
                disabled={!canSend}
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-teal-700 dark:bg-teal-500 text-white dark:text-zinc-950 hover:bg-teal-800 dark:hover:bg-teal-400 disabled:opacity-35 disabled:pointer-events-none transition-colors shrink-0 cursor-pointer"
                aria-label="Send message"
                title="Send message (Enter)"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="mt-2 text-center text-[11px] text-zinc-400 dark:text-zinc-500 select-none">
        SAHIN A AI supports AI image creation, voice-to-text dictation, vision analysis, and live web search.
      </p>
    </div>
  );
};
