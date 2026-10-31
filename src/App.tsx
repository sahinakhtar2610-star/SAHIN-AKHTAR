import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Bookmark,
  BookOpen,
  Code2,
  Download,
  Eye,
  Film,
  Globe,
  ImagePlus,
  Languages,
  Menu,
  Moon,
  Sun,
  Video,
  X,
} from "lucide-react";
import type {
  Attachment,
  ChatMessage,
  Conversation,
  SidebarFilter,
  StarterPrompt,
  WebSource,
} from "./types/chat";
import {
  createId,
  createSampleArchitectureDiagram,
  processImageFile,
} from "./utils/imageUtils";
import { stampAppBrandWatermark } from "./utils/watermark";
import { generateVideoFromPhoto } from "./utils/videoGenerator";
import { speakAssistantText, stopAllSpeech } from "./utils/speechUtils";
import { BrandMark } from "./components/BrandMark";
import { Sidebar } from "./components/Sidebar";
import { ChatMessageItem } from "./components/ChatMessageItem";
import { ChatInput } from "./components/ChatInput";
import { CapabilitiesModal } from "./components/CapabilitiesModal";
import { AppSplashScreen } from "./components/AppSplashScreen";
import { LoginModal } from "./components/LoginModal";
import { useAuth } from "./context/AuthContext";

const STORAGE_CONVERSATIONS_KEY = "sahin_ai_saved_conversations_v3";
const STORAGE_THEME_KEY = "sahin_ai_theme_v1";

const STARTER_PROMPTS: StarterPrompt[] = [
  {
    id: "video-gen-bengali",
    category: "AI Video Creation · ৪কে ভিডিও বানাও",
    title: "একটি সুন্দর পাহাড়ি নদীর ৪কে মোশন ভিডিও বানাও",
    prompt:
      "একটি সুন্দর পাহাড়ি নদী এবং সবুজ বনের সিনেমাটিক ৪কে মোশন ভিডিও তৈরি করো (Cinematic 4K motion video of a mountain river rushing through a lush evergreen valley)",
    isVideoGen: true,
  },
  {
    id: "image-gen-bengali",
    category: "AI Image Creation · ৪কে ছবি আঁকো",
    title: "একটি সুন্দর সূর্যাস্ত ও শান্ত নদীর ছবি আঁকো",
    prompt:
      "নদীর তীরে সূর্যাস্তের একটি শান্ত এবং অত্যন্ত সুন্দর পরাবাস্তব ছবি আঁকো (A serene twilight sunset over a calm river with warm golden and violet reflections)",
    isImageGen: true,
  },
  {
    id: "voice-demo-bengali",
    category: "AI Voice · মিষ্টি ভয়েসে কথা বলো",
    title: "SAHIN AI এর ক্ষমতাগুলো সুন্দর বাংলায় ভয়েসে শোনাও",
    prompt:
      "তুমি SAHIN AI। তোমার কাজ, বুদ্ধি এবং বিশেষ ক্ষমতাগুলো একটি সুন্দর, মিষ্টি ও স্পষ্ট বাংলা ভয়েসে আমাকে বলে শোনাও।",
    isVoice: true,
  },
  {
    id: "vision-diagram",
    category: "Vision Analysis",
    title: "Inspect an architecture diagram for bottlenecks",
    prompt:
      "Analyze this system architecture diagram. Identify the primary latency bottlenecks, retry storm risks, and recommend concrete architectural improvements.",
    attachSampleImage: true,
  },
  {
    id: "live-web-search",
    category: "Live Web Search",
    title: "Summarize major breakthroughs in AI & tech this week",
    prompt:
      "Search the web for the most notable software engineering and technology announcements from the past week and summarize the key takeaways with sources.",
    enableWebSearch: true,
  },
];

export function isImageGenerationIntent(text: string): boolean {
  const t = text.toLowerCase().trim();
  if (!t) return false;
  // Bengali intent triggers:
  if (
    /ছবি.*(আঁকো|বানাও|তৈরি|দাও|করো|জেনারেট)/i.test(t) ||
    /(আঁকো|বানাও|তৈরি|জেনারেট).*(ছবি|ইমেজ|পিকচার)/i.test(t) ||
    /(chobi|chhobi).*(toiri|banao|anko|draw|generate|make)/i.test(t) ||
    /(toiri koro|banao|anko).*(chobi|chhobi)/i.test(t) ||
    /^(chobi|chhobi)\b/i.test(t)
  ) {
    return true;
  }
  // English intent triggers:
  if (
    /^(\/image|generate image|create image|draw|paint|sketch|make an image|generate a picture|draw a picture|draw an image|create a picture)\b/i.test(t) ||
    /\b(generate an image|create an image|draw an image of|draw a picture of|paint an image of|generate a photo of|create a photo of|sketch a picture of)\b/i.test(t)
  ) {
    return true;
  }
  return false;
}

export function isVideoGenerationIntent(text: string): boolean {
  const t = text.toLowerCase().trim();
  if (!t) return false;
  // If user is asking a debug / meta question about why video failed, do not interpret as generation request
  if (/hoi na|hoy na|why|কেন|problem|error|fix|thik koro|thik kor|কাজ করে না|কাজ হয় না/i.test(t)) {
    return false;
  }
  // Bengali triggers:
  if (
    /ভিডিও.*(বানাও|তৈরি|করো|দাও|জেনারেট)/i.test(t) ||
    /(ছবি|ফটো|ইমেজ).*থেকে.*ভিডিও/i.test(t) ||
    /ভিডিও.*(ছবি|ফটো)/i.test(t) ||
    /(photo|chobi|chhobi).*theke.*video/i.test(t) ||
    /video.*(banao|toiri|koro|generate|make)/i.test(t) ||
    /\b(animate|motion).*photo\b/i.test(t)
  ) {
    return true;
  }
  // English triggers:
  if (
    /\b(generate video|create video|make a video|photo to video|image to video|animate this|animate image|turn photo into video|turn this photo into video)\b/i.test(t)
  ) {
    return true;
  }
  return false;
}

export function isVoiceGenerationIntent(text: string): boolean {
  const t = text.toLowerCase().trim();
  if (!t) return false;
  if (/hoi na|hoy na|why|কেন|problem|error|fix|thik koro|thik kor|কাজ করে না|কাজ হয় না/i.test(t)) {
    return false;
  }
  // Bengali voice triggers:
  if (
    /(ভয়েস|অডিও|কথা|আওয়াজ).*(বলো|শোনাও|বানাও|তৈরি|করো|জেনারেট)/i.test(t) ||
    /(voice|audio).*(generate|banao|toiri|koro|shunao|bolo|speak)/i.test(t) ||
    /\b(কথা বলো|শোনাও আমাকে|ভয়েসে উত্তর দাও|ভয়েস তৈরি করো|ভয়েস জেনারেট)\b/i.test(t)
  ) {
    return true;
  }
  // English voice triggers:
  if (
    /\b(generate voice|speak aloud|read aloud|voice response|say it out loud|speak this|text to speech)\b/i.test(t)
  ) {
    return true;
  }
  return false;
}

function loadInitialTheme(): "light" | "dark" {
  try {
    const saved = localStorage.getItem(STORAGE_THEME_KEY);
    if (saved === "light" || saved === "dark") {
      return saved;
    }
    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
  } catch {
    // Ignore storage read errors
  }
  return "dark";
}

/**
 * Loads only conversations explicitly marked as SAVED by the user.
 * "app theke back korle gora theke suru hobe kono history na thake Jothi save kore tobe thakbe"
 */
function loadInitialConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_CONVERSATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Only retain conversations the user has explicitly saved!
    return parsed.filter((c) => Boolean(c && c.saved));
  } catch {
    return [];
  }
}

/**
 * Persists ONLY saved conversations. Unsaved chats are ephemeral for the active session.
 */
function persistConversationsSafely(conversations: Conversation[]) {
  try {
    const savedOnly = conversations.filter((c) => Boolean(c && c.saved));
    localStorage.setItem(STORAGE_CONVERSATIONS_KEY, JSON.stringify(savedOnly));
  } catch {
    // Quota fallback: retain saved conversations with lightened media payloads
    try {
      const lightweight = conversations
        .filter((c) => Boolean(c && c.saved))
        .map((c, idx) => ({
          ...c,
          messages: c.messages.map((m) => ({
            ...m,
            attachments: idx < 2 ? m.attachments : undefined,
            generatedImages: idx < 2 ? m.generatedImages : undefined,
            generatedVideos: undefined,
          })),
        }));
      localStorage.setItem(STORAGE_CONVERSATIONS_KEY, JSON.stringify(lightweight));
    } catch {
      // Ignore quota fallback error
    }
  }
}

export function App() {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState<"light" | "dark">(loadInitialTheme);
  const [conversations, setConversations] = useState<Conversation[]>(loadInitialConversations);
  // Always start fresh from the beginning on load or back ("gora theke suru hobe")
  const [activeId, setActiveId] = useState<string | null>(null);

  const [sidebarFilter, setSidebarFilter] = useState<SidebarFilter>("all");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isReadingMode, setIsReadingMode] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [inputText, setInputText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [imageGenMode, setImageGenMode] = useState(false);
  const [videoGenMode, setVideoGenMode] = useState(false);
  const [voiceAutoSpeak, setVoiceAutoSpeak] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);


  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<Attachment | null>(null);
  const [modalState, setModalState] = useState<{
    open: boolean;
    tab: "capabilities" | "shortcuts";
  }>({ open: false, tab: "capabilities" });

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const dragCounterRef = useRef(0);

  // Sync theme with <html class="dark">
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    try {
      localStorage.setItem(STORAGE_THEME_KEY, theme);
    } catch {
      // Ignore
    }
  }, [theme]);

  // Persist conversations
  useEffect(() => {
    persistConversationsSafely(conversations);
  }, [conversations]);

  const activeConversation = conversations.find((c) => c.id === activeId) || null;

  // Auto-scroll chat container when messages update
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: isStreaming ? "auto" : "smooth",
    });
  }, [activeConversation?.messages, isStreaming]);

  const handleNewChat = useCallback(() => {
    if (isStreaming) {
      abortControllerRef.current?.abort();
      setIsStreaming(false);
    }
    stopAllSpeech();
    setActiveId(null);
    setInputText("");
    setAttachments([]);
  }, [isStreaming]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        handleNewChat();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setWebSearchEnabled((prev) => !prev);
      } else if (e.altKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        setIsReadingMode((prev) => !prev);
      } else if (e.key === "Escape") {
        if (lightboxImage) setLightboxImage(null);
        if (modalState.open) setModalState((s) => ({ ...s, open: false }));
        setIsReadingMode(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleNewChat, lightboxImage, modalState.open]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const generateAutoTitle = async (
    convId: string,
    userPrompt: string,
    assistantReply: string
  ) => {
    try {
      const res = await fetch("/api/chat/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: userPrompt,
          assistantMessage: assistantReply,
        }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { title?: string };
      if (data.title) {
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, title: data.title! } : c))
        );
      }
    } catch {
      // Silent fallback keeps initial title
    }
  };

  const streamAssistantReply = async (
    convId: string,
    historyMessages: ChatMessage[],
    assistantMessageId: string,
    useWebSearch: boolean,
    shouldAutoTitle: boolean,
    firstUserPrompt: string,
    shouldSpeakVoice: boolean = false
  ) => {
    setIsStreaming(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    let fullAssistantText = "";

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historyMessages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            attachments: m.attachments,
          })),
          webSearchEnabled: useWebSearch,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const rawEvent of events) {
          const lines = rawEvent.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const payload = JSON.parse(jsonStr) as {
                type: "text" | "sources" | "error" | "done";
                delta?: string;
                sources?: WebSource[];
                queries?: string[];
                error?: string;
              };

              if (payload.type === "text" && payload.delta) {
                fullAssistantText += payload.delta;
                const snapshot = fullAssistantText;
                setConversations((prev) =>
                  prev.map((conv) =>
                    conv.id !== convId
                      ? conv
                      : {
                          ...conv,
                          updatedAt: Date.now(),
                          messages: conv.messages.map((m) =>
                            m.id === assistantMessageId ? { ...m, content: snapshot } : m
                          ),
                        }
                  )
                );
              } else if (payload.type === "sources") {
                setConversations((prev) =>
                  prev.map((conv) =>
                    conv.id !== convId
                      ? conv
                      : {
                          ...conv,
                          messages: conv.messages.map((m) =>
                            m.id === assistantMessageId
                              ? {
                                  ...m,
                                  sources: payload.sources || [],
                                  searchQueries: payload.queries || [],
                                }
                              : m
                          ),
                        }
                  )
                );
              } else if (payload.type === "error") {
                setConversations((prev) =>
                  prev.map((conv) =>
                    conv.id !== convId
                      ? conv
                      : {
                          ...conv,
                          messages: conv.messages.map((m) =>
                            m.id === assistantMessageId
                              ? {
                                  ...m,
                                  content:
                                    payload.error || "An error occurred while generating a response.",
                                  isError: true,
                                }
                              : m
                          ),
                        }
                  )
                );
              }
            } catch {
              // Ignore malformed partial frame
            }
          }
        }
      }

      if (shouldAutoTitle && fullAssistantText.trim()) {
        generateAutoTitle(convId, firstUserPrompt, fullAssistantText);
      }

      if (shouldSpeakVoice && fullAssistantText.trim()) {
        speakAssistantText(assistantMessageId, fullAssistantText);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // User stopped generation intentionally
        if (!fullAssistantText.trim()) {
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id !== convId
                ? conv
                : {
                    ...conv,
                    messages: conv.messages.map((m) =>
                      m.id === assistantMessageId
                        ? { ...m, content: "*Generation stopped.*" }
                        : m
                    ),
                  }
            )
          );
        }
      } else {
        const message =
          err instanceof Error ? err.message : "Network error while contacting SAHIN A AI.";
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id !== convId
              ? conv
              : {
                  ...conv,
                  messages: conv.messages.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, content: message, isError: true }
                      : m
                  ),
                }
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const generateImageReply = async (
    convId: string,
    assistantMessageId: string,
    promptText: string,
    isFirstTurn: boolean
  ) => {
    setIsStreaming(true);
    const isBengali = /[\u0980-\u09FF]/.test(promptText);

    // Initial placeholder status
    setConversations((prev) =>
      prev.map((c) =>
        c.id !== convId
          ? c
          : {
              ...c,
              updatedAt: Date.now(),
              messages: c.messages.map((m) =>
                m.id === assistantMessageId
                  ? {
                      ...m,
                      content: isBengali
                        ? "🎨 SAHIN AI আপনার ছবিটি আঁকছে, অনুগ্রহ করে কয়েক সেকেন্ড অপেক্ষা করুন..."
                        : "🎨 Synthesizing your image with SAHIN AI, please wait a moment...",
                    }
                  : m
              ),
            }
      )
    );

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Image generation service failed.");
      }

      // Stamp official SAHIN AI logo & brand name directly onto the image canvas
      let watermarkedUrl = data.imageUrl;
      try {
        watermarkedUrl = await stampAppBrandWatermark(data.imageUrl, {
          appName: "SAHIN AI",
          logoUrl: "/logo.png",
          tagline: "AI CREATION",
          position: "bottom-right",
        });
      } catch (stampErr) {
        console.warn("Watermark stamp notice:", stampErr);
      }

      const caption = isBengali
        ? `আপনার অনুরোধ অনুযায়ী ছবিটি তৈরি করা হয়েছে:`
        : `Here is your generated image based on: **"${promptText}"**`;

      setConversations((prev) =>
        prev.map((c) =>
          c.id !== convId
            ? c
            : {
                ...c,
                updatedAt: Date.now(),
                messages: c.messages.map((m) =>
                  m.id === assistantMessageId
                    ? {
                        ...m,
                        content: caption,
                        generatedImages: [
                          {
                            id: createId(),
                            url: watermarkedUrl,
                            prompt: data.prompt || promptText,
                            modelUsed: data.model,
                            createdAt: Date.now(),
                          },
                        ],
                      }
                    : m
                ),
              }
        )
      );

      if (isFirstTurn) {
        generateAutoTitle(convId, promptText, "AI Image Creation");
      }

      if (voiceAutoSpeak) {
        speakAssistantText(assistantMessageId, caption);
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to synthesize image.";
      setConversations((prev) =>
        prev.map((c) =>
          c.id !== convId
            ? c
            : {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMessageId
                    ? {
                        ...m,
                        content: errorMsg,
                        isError: true,
                      }
                    : m
                ),
              }
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const generateVideoReply = async (
    convId: string,
    assistantMessageId: string,
    sourceImageUrl: string,
    promptText: string,
    isFirstTurn: boolean
  ) => {
    setIsStreaming(true);
    const isBengali = /[\u0980-\u09FF]/.test(promptText);

    setConversations((prev) =>
      prev.map((c) =>
        c.id !== convId
          ? c
          : {
              ...c,
              updatedAt: Date.now(),
              messages: c.messages.map((m) =>
                m.id === assistantMessageId
                  ? {
                      ...m,
                      content: isBengali
                        ? "🎬 SAHIN AI আপনার ফটো থেকে মোশন ভিডিও তৈরি করছে, কয়েক সেকেন্ড অপেক্ষা করুন..."
                        : "🎬 Synthesizing cinematic motion video from your photo with SAHIN AI, please wait a moment...",
                    }
                  : m
              ),
            }
      )
    );

    try {
      let finalVideoUrl = "";

      // 1. First attempt backend video synthesis
      try {
        const resp = await fetch("/api/generate-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: sourceImageUrl,
            motionPrompt: promptText,
          }),
        });
        const serverData = await resp.json();
        if (resp.ok && serverData.success && serverData.videoUrl) {
          finalVideoUrl = serverData.videoUrl;
        }
      } catch (srvErr) {
        console.warn("Backend video route notice:", srvErr);
      }

      // 2. Client-side synthesis fallback (guarantees 100% video creation success with SAHIN AI watermark)
      if (!finalVideoUrl) {
        const clientSynth = await generateVideoFromPhoto(sourceImageUrl, {
          durationSeconds: 10,
          fps: 30,
          motionPreset: "cinematic_zoom",
        });
        finalVideoUrl = clientSynth.videoUrl;
      }

      const caption = isBengali
        ? `আপনার ফটো থেকে সফলভাবে ১০ সেকেন্ডের মোশন ভিডিও তৈরি করা হয়েছে:`
        : `Here is your 10-second animated video generated from your photo:`;

      setConversations((prev) =>
        prev.map((c) =>
          c.id !== convId
            ? c
            : {
                ...c,
                updatedAt: Date.now(),
                messages: c.messages.map((m) =>
                  m.id === assistantMessageId
                    ? {
                        ...m,
                        content: caption,
                        generatedVideos: [
                          {
                            id: createId(),
                            url: finalVideoUrl,
                            sourceImageUrl,
                            prompt: promptText || "Photo Motion Animation",
                            durationSeconds: 10,
                            modelUsed: "SAHIN-AI-Motion-Studio",
                            createdAt: Date.now(),
                          },
                        ],
                      }
                    : m
                ),
              }
        )
      );

      if (isFirstTurn) {
        generateAutoTitle(convId, promptText || "Photo to Video", "AI Video");
      }

      if (voiceAutoSpeak) {
        speakAssistantText(assistantMessageId, caption);
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to synthesize video.";
      setConversations((prev) =>
        prev.map((c) =>
          c.id !== convId
            ? c
            : {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMessageId
                    ? {
                        ...m,
                        content: errorMsg,
                        isError: true,
                      }
                    : m
                ),
              }
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleAnimateImage = (imageUrl: string, promptText: string) => {
    if (isStreaming) return;
    const now = Date.now();
    let targetConvId = activeId;
    let isFirst = false;

    if (!targetConvId || !conversations.some((c) => c.id === targetConvId)) {
      targetConvId = createId();
      isFirst = true;
      const newConv: Conversation = {
        id: targetConvId,
        title: "Photo to Video",
        createdAt: now,
        updatedAt: now,
        saved: false,
        messages: [],
      };
      setConversations((prev) => [newConv, ...prev]);
      setActiveId(targetConvId);
    }

    const userMsgId = createId();
    const assistantMsgId = createId();

    const userMessage: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: `এই ছবি থেকে মোশন ভিডিও তৈরি করো: "${promptText.slice(0, 45)}"`,
      createdAt: now,
    };

    const assistantPlaceholder: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      createdAt: now + 1,
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id !== targetConvId
          ? c
          : {
              ...c,
              updatedAt: now,
              messages: [...c.messages, userMessage, assistantPlaceholder],
            }
      )
    );

    generateVideoReply(
      targetConvId,
      assistantMsgId,
      imageUrl,
      promptText || "Cinematic Motion Video",
      isFirst
    );
  };

  const sendMessage = async (options?: {
    overrideText?: string;
    overrideAttachments?: Attachment[];
    overrideWebSearch?: boolean;
    forceImageGen?: boolean;
    forceVideoGen?: boolean;
  }) => {
    if (isStreaming) return;

    const textToSend = (options?.overrideText ?? inputText).trim();
    const attachmentsToSend = options?.overrideAttachments ?? attachments;
    const useSearch = options?.overrideWebSearch ?? webSearchEnabled;
    const isVideoGen = Boolean(
      options?.forceVideoGen || videoGenMode || isVideoGenerationIntent(textToSend)
    );
    const isVoiceGen = Boolean(
      voiceAutoSpeak || isVoiceGenerationIntent(textToSend)
    );
    const isImageGen = Boolean(
      !isVideoGen &&
        (options?.forceImageGen || imageGenMode || isImageGenerationIntent(textToSend))
    );

    if (!textToSend && attachmentsToSend.length === 0) return;

    const now = Date.now();
    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: textToSend,
      createdAt: now,
      attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
    };

    const assistantMessageId = createId();
    const assistantPlaceholder: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      createdAt: now + 1,
      webSearchUsed: !isImageGen && !isVideoGen && useSearch,
    };

    let targetConvId = activeId;
    let historyForRequest: ChatMessage[] = [];
    let isFirstTurn = false;

    if (!targetConvId || !conversations.some((c) => c.id === targetConvId)) {
      targetConvId = createId();
      isFirstTurn = true;
      const fallbackTitle = textToSend
        ? textToSend.slice(0, 44)
        : isVideoGen
        ? "Photo to Video"
        : isImageGen
        ? "AI Image Generation"
        : "Image Analysis";

      const newConv: Conversation = {
        id: targetConvId,
        title: fallbackTitle,
        createdAt: now,
        updatedAt: now,
        saved: false,
        messages: [userMessage, assistantPlaceholder],
      };

      historyForRequest = [userMessage];
      setConversations((prev) => [newConv, ...prev]);
      setActiveId(targetConvId);
    } else {
      const existing = conversations.find((c) => c.id === targetConvId)!;
      isFirstTurn = existing.messages.length === 0;
      historyForRequest = [...existing.messages.filter((m) => !m.isError), userMessage];

      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === targetConvId
            ? {
                ...c,
                updatedAt: now,
                messages: [...c.messages, userMessage, assistantPlaceholder],
              }
            : c
        );
        const target = updated.find((c) => c.id === targetConvId);
        const others = updated.filter((c) => c.id !== targetConvId);
        return target ? [target, ...others] : updated;
      });
    }

    setInputText("");
    setAttachments([]);

    // Route to Video Generation if requested
    if (isVideoGen) {
      let imageToAnimate = attachmentsToSend[0]?.dataUrl;
      // Look for latest image in conversation if none attached
      if (!imageToAnimate && targetConvId) {
        const conv = conversations.find((c) => c.id === targetConvId);
        if (conv) {
          for (let i = conv.messages.length - 1; i >= 0; i--) {
            const m = conv.messages[i];
            if (m.generatedImages && m.generatedImages.length > 0) {
              imageToAnimate = m.generatedImages[0].url;
              break;
            }
            if (m.attachments && m.attachments.length > 0) {
              imageToAnimate = m.attachments[0].dataUrl;
              break;
            }
          }
        }
      }

      // If no photo was attached, synthesize the 4K base image from the prompt first, then animate it into video!
      if (!imageToAnimate) {
        const videoPrompt = textToSend || "Cinematic 4K nature motion";
        const isBengali = /[\u0980-\u09FF]/.test(videoPrompt);

        setConversations((prev) =>
          prev.map((c) =>
            c.id !== targetConvId
              ? c
              : {
                  ...c,
                  updatedAt: now,
                  messages: c.messages.map((m) =>
                    m.id === assistantMessageId
                      ? {
                          ...m,
                          content: isBengali
                            ? "🎬 SAHIN AI আপনার প্রম্পট থেকে ৪কে সিন প্রস্তুত করে ১০ সেকেন্ডের মোশন ভিডিও তৈরি করছে, কয়েক সেকেন্ড অপেক্ষা করুন..."
                            : "🎬 Synthesizing 4K scene & rendering 10-second cinematic video with SAHIN AI...",
                        }
                      : m
                  ),
                }
          )
        );

        try {
          const imgResp = await fetch("/api/generate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: videoPrompt, aspectRatio: "16:9" }),
          });
          const imgData = await imgResp.json();
          if (imgResp.ok && imgData.success && imgData.imageUrl) {
            imageToAnimate = imgData.imageUrl;
            try {
              imageToAnimate = await stampAppBrandWatermark(imgData.imageUrl, {
                appName: "SAHIN AI",
                logoUrl: "/logo.png",
                tagline: "4K ULTRA HD",
                position: "bottom-right",
              });
            } catch {
              // Ignore watermark stamp fallback
            }
          }
        } catch (imgErr) {
          console.warn("Base image generation for video failed:", imgErr);
        }
      }

      if (imageToAnimate) {
        await generateVideoReply(
          targetConvId,
          assistantMessageId,
          imageToAnimate,
          textToSend || "Cinematic Motion Video",
          isFirstTurn
        );
        return;
      }
    }

    // Route to Image Generation engine if requested or detected
    if (isImageGen && textToSend) {
      await generateImageReply(
        targetConvId,
        assistantMessageId,
        textToSend,
        isFirstTurn
      );
      return;
    }

    await streamAssistantReply(
      targetConvId,
      historyForRequest,
      assistantMessageId,
      useSearch,
      isFirstTurn,
      textToSend || "Analyze uploaded image",
      isVoiceGen
    );
  };

  const handleStopStreaming = () => {
    abortControllerRef.current?.abort();
  };

  const handleRegenerateLast = async () => {
    if (!activeConversation || isStreaming) return;
    const msgs = activeConversation.messages;
    if (msgs.length === 0) return;

    // Remove the trailing assistant message and re-run from the last user message
    let trimmed = [...msgs];
    if (trimmed[trimmed.length - 1].role === "assistant") {
      trimmed.pop();
    }
    if (trimmed.length === 0) return;

    const lastUserMsg = [...trimmed].reverse().find((m) => m.role === "user");
    const isImageGen =
      lastUserMsg &&
      (isImageGenerationIntent(lastUserMsg.content) || imageGenMode);

    const assistantMessageId = createId();
    const placeholder: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      webSearchUsed: !isImageGen && webSearchEnabled,
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? { ...c, updatedAt: Date.now(), messages: [...trimmed, placeholder] }
          : c
      )
    );

    if (isImageGen && lastUserMsg && lastUserMsg.content.trim()) {
      await generateImageReply(
        activeConversation.id,
        assistantMessageId,
        lastUserMsg.content.trim(),
        false
      );
      return;
    }

    await streamAssistantReply(
      activeConversation.id,
      trimmed.filter((m) => !m.isError),
      assistantMessageId,
      webSearchEnabled,
      false,
      ""
    );
  };

  const handleStarterClick = (starter: StarterPrompt) => {
    const nextWebSearch = Boolean(starter.enableWebSearch);
    if (starter.enableWebSearch !== undefined) {
      setWebSearchEnabled(nextWebSearch);
    }
    if (starter.isVoice) {
      setVoiceAutoSpeak(true);
    }
    if (starter.isVideoGen) {
      setVideoGenMode(true);
    }

    let sampleAttachments: Attachment[] = [];
    if (starter.attachSampleImage) {
      sampleAttachments = [createSampleArchitectureDiagram()];
    }

    sendMessage({
      overrideText: starter.prompt,
      overrideAttachments: sampleAttachments,
      overrideWebSearch: nextWebSearch,
      forceImageGen: starter.isImageGen,
      forceVideoGen: starter.isVideoGen,
    });
  };

  const handleToggleSaveConversation = (id: string) => {

    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, saved: !c.saved } : c))
    );
  };

  const handleRenameConversation = (id: string, nextTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: nextTitle } : c))
    );
  };

  const handleDeleteConversation = (id: string) => {
    if (isStreaming && id === activeId) {
      abortControllerRef.current?.abort();
    }
    setConversations((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      if (activeId === id) {
        setActiveId(remaining.length > 0 ? remaining[0].id : null);
      }
      return remaining;
    });
  };

  const handleClearAllConversations = () => {
    if (isStreaming) {
      abortControllerRef.current?.abort();
    }
    setConversations([]);
    setActiveId(null);
  };

  const handleExportMarkdown = () => {
    if (!activeConversation) return;
    const lines: string[] = [
      `# ${activeConversation.title}`,
      "",
      `Exported from SAHIN A AI · ${new Date().toLocaleString()}`,
      "",
      "---",
      "",
    ];

    for (const msg of activeConversation.messages) {
      const speaker = msg.role === "user" ? "User" : "SAHIN A AI";
      lines.push(`### ${speaker}`);
      lines.push("");
      if (msg.attachments && msg.attachments.length > 0) {
        lines.push(`*[Attached ${msg.attachments.length} image(s)]*`);
        lines.push("");
      }
      lines.push(msg.content || "");
      if (msg.sources && msg.sources.length > 0) {
        lines.push("");
        lines.push("**Web Sources:**");
        for (const src of msg.sources) {
          lines.push(`- [${src.title}](${src.uri})`);
        }
      }
      lines.push("");
    }

    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeConversation.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "sahin-a-ai-chat"}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Full-Viewport Drag-and-Drop Handlers
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) {
      dragCounterRef.current += 1;
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) {
      setIsDraggingOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files || []).filter((f) =>
      f.type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(f.name)
    );
    if (droppedFiles.length === 0) return;

    const remaining = Math.max(0, 4 - attachments.length);
    const processed: Attachment[] = [];
    for (const file of droppedFiles.slice(0, remaining)) {
      try {
        const att = await processImageFile(file);
        processed.push(att);
      } catch {
        // Ignore invalid dropped file
      }
    }
    if (processed.length > 0) {
      setAttachments((prev) => [...prev, ...processed]);
    }
  };

  return (
    <>
      {isInitialLoading && (
        <AppSplashScreen
          onComplete={() => setIsInitialLoading(false)}
          durationMs={2000}
        />
      )}
      <div
        className="flex h-dvh w-full overflow-hidden bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
      {/* Left Conversation History Sidebar (Hidden in Reading Mode) */}
      {!isReadingMode && (
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          filter={sidebarFilter}
          onFilterChange={setSidebarFilter}
          onSelectConversation={(id) => setActiveId(id)}
          onNewChat={handleNewChat}
          onToggleSave={handleToggleSaveConversation}
          onRenameConversation={handleRenameConversation}
          onDeleteConversation={handleDeleteConversation}
          onClearAllConversations={handleClearAllConversations}
          onExportActiveConversation={handleExportMarkdown}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Main Conversational Workspace */}
      <div className="relative flex flex-col flex-1 min-w-0 h-full bg-white dark:bg-zinc-900/40">
        {/* Drag-and-Drop Visual Overlay */}
        {isDraggingOver && (
          <div className="absolute inset-3 z-30 rounded-2xl border-2 border-dashed border-teal-600 dark:border-teal-400 bg-teal-50/90 dark:bg-zinc-900/90 backdrop-blur-xs flex flex-col items-center justify-center gap-2 pointer-events-none">
            <div className="w-12 h-12 rounded-xl bg-teal-700 dark:bg-teal-500 text-white dark:text-zinc-950 flex items-center justify-center">
              <ImagePlus className="w-6 h-6" />
            </div>
            <p className="font-display font-semibold text-base text-zinc-900 dark:text-zinc-100">
              Drop images to analyze with SAHIN AI
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Supports PNG, JPEG, WEBP, and GIF up to 4 images
            </p>
          </div>
        )}

        {/* Top Bar (Strict 3-Zone Contract: Brand — Nav Links — Actions) */}
        <header className="flex items-center justify-between gap-8 px-4 sm:px-6 h-14 border-b border-zinc-200 dark:border-zinc-800/90 bg-white/95 dark:bg-zinc-950/95 shrink-0">
          {/* Zone 1: Brand Title */}
          <div className="flex items-center gap-2.5 shrink-0">
            {!isReadingMode && (
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden p-2 -ml-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                aria-label="Open conversation history"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleNewChat}
              className="flex items-center gap-2 font-display text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <BrandMark size="sm" />
              <span>SAHIN AI</span>
            </button>
          </div>

          {/* Zone 2: Clean Single-Line Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            <button
              type="button"
              onClick={handleNewChat}
              className="hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              New Chat
            </button>
            <button
              type="button"
              onClick={() => {
                setSidebarFilter((prev) => (prev === "saved" ? "all" : "saved"));
              }}
              className={`hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                sidebarFilter === "saved" ? "text-teal-700 dark:text-teal-400 font-semibold" : ""
              }`}
            >
              Saved Chats
            </button>
            <button
              type="button"
              onClick={() => setModalState({ open: true, tab: "capabilities" })}
              className="hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Capabilities
            </button>
            <button
              type="button"
              onClick={() => setModalState({ open: true, tab: "shortcuts" })}
              className="hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Shortcuts
            </button>
          </nav>

          {/* Zone 3: Header Actions (Reading Mode Toggle & Theme Toggle) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Reading Mode Toggle Button */}
            <button
              type="button"
              onClick={() => setIsReadingMode((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isReadingMode
                  ? "bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-800"
                  : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
              title={
                isReadingMode
                  ? "Exit Reading Mode (Esc or Alt+R)"
                  : "Reading Mode: Distraction-free view without sidebar or input (Alt+R)"
              }
              aria-pressed={isReadingMode}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span>{isReadingMode ? "Exit Reading" : "Reading Mode"}</span>
            </button>

            {activeConversation && (
              <button
                type="button"
                onClick={() => handleToggleSaveConversation(activeConversation.id)}
                className={`sm:hidden p-2 rounded-lg transition-colors cursor-pointer ${
                  activeConversation.saved
                    ? "text-teal-700 dark:text-teal-400"
                    : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
                aria-label={activeConversation.saved ? "Remove from Saved" : "Save conversation"}
              >
                <Bookmark
                  className={`w-4 h-4 ${activeConversation.saved ? "fill-current" : ""}`}
                />
              </button>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-zinc-700" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>

            {/* Authenticated Gmail Profile Chip */}
            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-zinc-800 shrink-0">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "User"}
                    className="w-7 h-7 rounded-full border border-zinc-300 dark:border-zinc-700 object-cover"
                    title={user.email || user.displayName || "Gmail User"}
                  />
                ) : (
                  <div
                    className="w-7 h-7 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center"
                    title={user.email || "Gmail User"}
                  >
                    {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
                  </div>
                )}
                <button
                  type="button"
                  onClick={logout}
                  className="hidden md:inline-flex text-[11px] font-medium text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 transition-colors cursor-pointer"
                  title="Sign out of Gmail"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Reading Mode Top Status Banner */}
        {isReadingMode && (
          <div className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 py-2 bg-zinc-100/90 dark:bg-zinc-900/90 backdrop-blur-xs border-b border-zinc-200/80 dark:border-zinc-800/80 text-xs text-zinc-600 dark:text-zinc-400">
            <div className="flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
              <span className="font-medium text-zinc-800 dark:text-zinc-200">Reading Mode</span>
              <span aria-hidden="true" className="text-zinc-400">·</span>
              <span>Distraction-free conversation view</span>
            </div>
            <button
              type="button"
              onClick={() => setIsReadingMode(false)}
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-200/80 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              Exit (Esc)
            </button>
          </div>
        )}

        {/* Main Scrollable Thread or Welcome Canvas */}
        <main
          ref={messagesContainerRef}
          className={`flex-1 overflow-y-auto px-4 sm:px-6 ${isReadingMode ? "pb-24 pt-4" : ""}`}
        >
          {!activeConversation || activeConversation.messages.length === 0 ? (
            <div className="min-h-full max-w-3xl mx-auto flex flex-col justify-center py-10 sm:py-16">
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3">
                  <BrandMark size="lg" />
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-semibold text-teal-700 dark:text-teal-400">2K / 4K Ultra HD</span>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    <span>Photo to Video</span>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    <span>Live Search</span>
                  </div>
                </div>

                <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 text-balance">
                  How can SAHIN AI assist you today?
                </h1>
                <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
                  Generate ultra-detailed 2K / 4K images, create cinematic motion videos from photos, analyze system designs, or chat with live web intelligence.
                </p>
              </div>

              {/* Curated Starter Prompt Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STARTER_PROMPTS.map((item) => {
                  const Icon =
                    item.id === "vision-diagram"
                      ? Eye
                      : item.id === "live-web-search"
                      ? Globe
                      : item.id === "code-generation"
                      ? Code2
                      : Languages;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleStarterClick(item)}
                      className="text-left p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 hover:bg-zinc-100/80 dark:hover:bg-zinc-900 hover:border-teal-600/40 dark:hover:border-teal-500/40 transition-colors flex flex-col justify-between gap-3 cursor-pointer group"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <span>{item.category}</span>
                        <Icon className="w-4 h-4 text-zinc-400 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors shrink-0" />
                      </div>
                      <p className="font-display text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
                        {item.title}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-6 sm:py-8 space-y-7">
              {/* Active Conversation Contextual Bar */}
              <div className="flex items-center justify-between gap-4 pb-3 border-b border-zinc-100 dark:border-zinc-800/70 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate">
                  {activeConversation.title}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleSaveConversation(activeConversation.id)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    activeConversation.saved
                      ? "text-teal-700 dark:text-teal-400 font-medium"
                      : "hover:text-zinc-900 dark:hover:text-zinc-200"
                  }`}
                >
                  <Bookmark
                    className={`w-3.5 h-3.5 ${activeConversation.saved ? "fill-current" : ""}`}
                  />
                  <span>{activeConversation.saved ? "Saved" : "Save Chat"}</span>
                </button>
              </div>

              {/* Message Bubbles */}
              {activeConversation.messages.map((msg, idx) => {
                const isLast = idx === activeConversation.messages.length - 1;
                const isLastAssistant = msg.role === "assistant" && isLast;

                return (
                  <ChatMessageItem
                    key={msg.id}
                    message={msg}
                    isStreaming={isStreaming && isLastAssistant}
                    isLastAssistant={isLastAssistant}
                    onRegenerate={isLastAssistant ? handleRegenerateLast : undefined}
                    onPreviewImage={(att) => setLightboxImage(att)}
                    onRequestAnimateImage={(imgUrl, prompt) => handleAnimateImage(imgUrl, prompt)}
                  />
                );
              })}
            </div>
          )}
        </main>

        {/* Bottom Chat Input Composer (Hidden in Reading Mode) */}
        {!isReadingMode && (
          <ChatInput
            value={inputText}
            onChange={setInputText}
            attachments={attachments}
            onAddAttachments={(items) => setAttachments((prev) => [...prev, ...items])}
            onRemoveAttachment={(id) =>
              setAttachments((prev) => prev.filter((item) => item.id !== id))
            }
            onPreviewAttachment={(att) => setLightboxImage(att)}
            webSearchEnabled={webSearchEnabled}
            onToggleWebSearch={() => setWebSearchEnabled((prev) => !prev)}
            imageGenMode={imageGenMode}
            onToggleImageGen={() => setImageGenMode((prev) => !prev)}
            videoGenMode={videoGenMode}
            onToggleVideoGen={() => setVideoGenMode((prev) => !prev)}
            voiceAutoSpeak={voiceAutoSpeak}
            onToggleVoiceAutoSpeak={() => {
              if (voiceAutoSpeak) {
                stopAllSpeech();
              }
              setVoiceAutoSpeak((prev) => !prev);
            }}
            isStreaming={isStreaming}
            onSend={() => sendMessage()}
            onStop={handleStopStreaming}
          />
        )}
      </div>

      {/* Capabilities & Keyboard Shortcuts Reference Modal */}
      <CapabilitiesModal
        isOpen={modalState.open}
        initialTab={modalState.tab}
        onClose={() => setModalState((s) => ({ ...s, open: false }))}
      />

      {/* Full-Resolution Image Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center gap-3 w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between text-xs text-zinc-200 px-3 py-2 bg-zinc-900/90 rounded-xl border border-zinc-800">
              <div className="flex items-center gap-2 min-w-0">
                <img src="/logo.png" alt="Logo" className="w-5 h-5 object-contain shrink-0" />
                <span className="font-bold text-white tracking-wide">SAHIN AI</span>
                <span className="text-zinc-600">·</span>
                <span className="text-teal-400 font-mono text-[11px] bg-teal-950/60 border border-teal-800/60 px-1.5 py-0.5 rounded-full">
                  2K / 4K UHD
                </span>
                <span className="truncate font-mono text-zinc-400 hidden sm:inline">{lightboxImage.name}</span>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const img = lightboxImage;
                    setLightboxImage(null);
                    handleAnimateImage(img.dataUrl, img.name);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors cursor-pointer"
                  title="Animate photo into motion video"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>ভিডিও বানাও</span>
                </button>
                <a
                  href={lightboxImage.dataUrl}
                  download={lightboxImage.name.endsWith(".jpg") || lightboxImage.name.endsWith(".png") ? lightboxImage.name : `${lightboxImage.name}.jpg`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-medium text-xs transition-colors cursor-pointer"
                  title="Download image"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxImage(null)}
                  className="inline-flex items-center gap-1 p-1.5 rounded-lg bg-zinc-800 text-zinc-100 hover:bg-zinc-700 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="relative rounded-2xl overflow-hidden border border-zinc-700/80 bg-zinc-950 flex items-center justify-center max-h-[78vh]">
              <img
                src={lightboxImage.dataUrl}
                alt={lightboxImage.name}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[78vh] w-auto h-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Gmail Login Gate for First-Time Users */}
      <LoginModal />
      </div>
    </>
  );
}

export default App;
