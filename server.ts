import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import type { Content, GenerateContentResponse, Part } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ClientAttachment {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
}

interface ClientMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: ClientAttachment[];
}

interface WebSource {
  title: string;
  uri: string;
  domain: string;
}

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error(
      "API key is not configured. Please verify your API key in the Settings > Secrets panel."
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function extractBase64Payload(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return null;
  }
  return {
    mimeType: match[1],
    data: match[2],
  };
}

function buildContents(messages: ClientMessage[]): Content[] {
  const contents: Content[] = [];

  for (const msg of messages) {
    const parts: Part[] = [];

    if (msg.attachments && msg.attachments.length > 0) {
      for (const att of msg.attachments) {
        const parsed = extractBase64Payload(att.dataUrl);
        if (parsed) {
          parts.push({
            inlineData: {
              mimeType: parsed.mimeType,
              data: parsed.data,
            },
          });
        }
      }
    }

    const trimmedText = (msg.content || "").trim();
    if (trimmedText) {
      parts.push({ text: trimmedText });
    } else if (parts.length > 0 && msg.role === "user") {
      parts.push({ text: "Please analyze this image in detail." });
    }

    if (parts.length > 0) {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts,
      });
    }
  }

  return contents;
}

function extractDomain(uri: string): string {
  try {
    const parsed = new URL(uri);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "web";
  }
}

const SYSTEM_INSTRUCTION = `You are SAHIN AI, an intelligent, articulate, and versatile conversational AI assistant.

Core behavior guidelines:
- Identity: Your name is SAHIN AI. Never claim to be any other assistant, model family, or platform.
- Speed & Responsiveness: Answer immediately, directly, and concisely without filler greetings or delay. Begin delivering the primary answer in the very first sentence.
- Tone & Clarity: Write clearly, accurately, and thoughtfully. Structure complex answers with clean Markdown headings, concise bullet points, tables when comparing options, and fenced code blocks with language identifiers (e.g., \`\`\`typescript, \`\`\`python, \`\`\`bash).
- Multilingual Fluency: Respond naturally in the language or script the user uses (including English, Bengali / বাংলা, Banglish, Hindi, or any other language).
- Vision & Image Analysis: When the user provides one or more images, inspect visual details, text/OCR, UI layouts, code screenshots, diagrams, or objects carefully and give structured, actionable insights.
- Web Search & Real-Time Grounding: When web search is enabled, synthesize up-to-date facts accurately and cite context naturally.`;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "25mb" }));

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", app: "SAHIN AI" });
  });

  app.post("/api/chat/stream", async (req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const sendEvent = (payload: Record<string, unknown>) => {
      if (!res.destroyed && !res.writableEnded) {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      }
    };

    try {
      const { messages, webSearchEnabled } = req.body as {
        messages?: ClientMessage[];
        webSearchEnabled?: boolean;
      };

      if (!Array.isArray(messages) || messages.length === 0) {
        sendEvent({ type: "error", error: "Please enter a message or attach an image to start." });
        res.end();
        return;
      }

      const contents = buildContents(messages);
      if (contents.length === 0) {
        sendEvent({ type: "error", error: "Message content cannot be empty." });
        res.end();
        return;
      }

      const ai = getGenAIClient();

      let streamResponse: any = null;
      let usedSearch = Boolean(webSearchEnabled);

      if (webSearchEnabled) {
        try {
          streamResponse = await ai.models.generateContentStream({
            model: "gemini-3.1-flash-lite",
            contents,
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
              tools: [{ googleSearch: {} }],
            },
          });
        } catch (searchErr: unknown) {
          const msg = searchErr instanceof Error ? searchErr.message : "";
          if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")) {
            console.warn("Web search tool quota exhausted; falling back to direct answer.");
            usedSearch = false;
            sendEvent({
              type: "text",
              delta: "*[Live Web Search quota limit reached; providing direct answer]*\n\n",
            });
            streamResponse = await ai.models.generateContentStream({
              model: "gemini-3.1-flash-lite",
              contents,
              config: {
                systemInstruction: SYSTEM_INSTRUCTION,
              },
            });
          } else {
            throw searchErr;
          }
        }
      } else {
        streamResponse = await ai.models.generateContentStream({
          model: "gemini-3.1-flash-lite",
          contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
          },
        });
      }

      const collectedSources = new Map<string, WebSource>();
      const collectedQueries = new Set<string>();

      for await (const rawChunk of streamResponse) {
        if (res.destroyed || res.writableEnded) {
          break;
        }

        const chunk = rawChunk as GenerateContentResponse;
        const deltaText = chunk.text;
        if (deltaText) {
          sendEvent({ type: "text", delta: deltaText });
        }

        const groundingMeta = chunk.candidates?.[0]?.groundingMetadata;
        if (groundingMeta && usedSearch) {
          if (Array.isArray(groundingMeta.webSearchQueries)) {
            for (const q of groundingMeta.webSearchQueries) {
              if (typeof q === "string" && q.trim()) {
                collectedQueries.add(q.trim());
              }
            }
          }

          if (Array.isArray(groundingMeta.groundingChunks)) {
            for (const gChunk of groundingMeta.groundingChunks) {
              const web = gChunk.web;
              if (web?.uri) {
                collectedSources.set(web.uri, {
                  uri: web.uri,
                  title: web.title?.trim() || extractDomain(web.uri),
                  domain: extractDomain(web.uri),
                });
              }
            }
          }
        }
      }

      if (!res.destroyed && !res.writableEnded) {
        if (collectedSources.size > 0 || collectedQueries.size > 0) {
          sendEvent({
            type: "sources",
            sources: Array.from(collectedSources.values()),
            queries: Array.from(collectedQueries),
          });
        }
        sendEvent({ type: "done" });
        res.end();
      }
    } catch (err: unknown) {
      console.error("Stream generation error:", err);
      const rawMessage = err instanceof Error ? err.message : "Unexpected server error.";
      let friendlyMessage = rawMessage;

      if (
        rawMessage.includes("API_KEY_INVALID") ||
        rawMessage.includes("PERMISSION_DENIED") ||
        rawMessage.includes("403")
      ) {
        friendlyMessage =
          "Unable to authenticate with the AI service. Please check your API key in the Settings > Secrets panel.";
      } else if (rawMessage.includes("RESOURCE_EXHAUSTED") || rawMessage.includes("429")) {
        friendlyMessage =
          "Rate limit or quota reached. Please wait a moment and try again, or upgrade your API key quota in Settings > Secrets.";
      }

      sendEvent({ type: "error", error: friendlyMessage });
      if (!res.writableEnded) {
        res.end();
      }
    }
  });

  app.post("/api/generate-image", async (req: Request, res: Response) => {
    try {
      const { prompt, aspectRatio } = req.body as {
        prompt?: string;
        aspectRatio?: string;
      };

      const rawPrompt = (prompt || "").trim();
      if (!rawPrompt) {
        res.status(400).json({ success: false, error: "Please provide a prompt describing the image you want to create." });
        return;
      }

      // Check if prompt contains Bengali or non-English characters, or enrich visual fidelity with Gemini
      let enrichedPrompt = rawPrompt;
      try {
        const ai = getGenAIClient();
        const enrichResponse = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: `You are an AI image prompt synthesizer. The user wants to generate an image from this description: "${rawPrompt}". If the description is in Bengali, Hindi, or any other language, translate it into English and enhance it with vivid visual details, lighting, and composition suited for image generation. Return ONLY the enhanced English prompt as a single paragraph without any preamble or quotes.`,
        });
        const generated = enrichResponse.text?.trim();
        if (generated && generated.length > 5) {
          enrichedPrompt = generated.replace(/^["'`]+|["'`]+$/g, "");
        }
      } catch {
        // Fallback to original prompt if enrichment model is briefly unavailable
      }

      // 2K / 4K Ultra-HD AI Image Synthesis
      let width = 2048;
      let height = 2048;
      if (aspectRatio === "16:9") {
        width = 2560;
        height = 1440; // 2K QHD Widescreen
      } else if (aspectRatio === "9:16") {
        width = 1440;
        height = 2560; // 2K QHD Portrait
      } else if (aspectRatio === "4:3") {
        width = 2048;
        height = 1536;
      } else if (aspectRatio === "3:4") {
        width = 1536;
        height = 2048;
      }

      const seed = Math.floor(Math.random() * 1000000);
      const promptWithQuality = `${enrichedPrompt}, 4k ultra hd resolution, photorealistic masterpiece, 8k textures, sharp focus`;
      const encoded = encodeURIComponent(promptWithQuality.slice(0, 450));
      const pollUrl = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&seed=${seed}&nologo=true`;

      const fetchRes = await fetch(pollUrl, { signal: AbortSignal.timeout(28000) });
      if (!fetchRes.ok) {
        throw new Error(`Synthesis engine returned status ${fetchRes.status}`);
      }

      const arrayBuffer = await fetchRes.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const contentType = fetchRes.headers.get("content-type") || "image/jpeg";
      const dataUrl = `data:${contentType};base64,${base64}`;

      res.json({
        success: true,
        imageUrl: dataUrl,
        prompt: rawPrompt,
        enhancedPrompt: enrichedPrompt,
        model: "SAHIN-AI-Synthesis",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to synthesize image.";
      console.warn("Image generation notice:", msg);
      res.status(500).json({
        success: false,
        error: `Could not generate image: ${msg}. Please try again with a descriptive prompt.`,
      });
    }
  });

  app.post("/api/generate-video", async (req: Request, res: Response) => {
    try {
      const { imageBase64, mimeType, motionPrompt } = req.body as {
        imageBase64?: string;
        mimeType?: string;
        motionPrompt?: string;
      };

      if (!imageBase64) {
        res.status(400).json({ success: false, error: "Image data is required to generate video." });
        return;
      }

      // Try Gemini Omni Flash video generation if available
      try {
        const ai = getGenAIClient();
        const interaction = await ai.interactions.create(
          {
            model: "gemini-omni-1.1-flash",
            input: [
              {
                type: "image",
                mime_type: mimeType || "image/jpeg",
                data: imageBase64.replace(/^data:[^;]+;base64,/, ""),
              },
              {
                type: "text",
                text: motionPrompt || "Cinematic camera zoom and subtle lifelike motion.",
              },
            ],
            background: false,
            store: false,
            stream: false,
            response_format: {
              type: "video",
              aspect_ratio: "16:9",
            },
          },
          { timeout: 120000 }
        );

        const videoPart = interaction.output_video;
        if (videoPart && videoPart.data) {
          const videoDataUrl = `data:${videoPart.mime_type || "video/mp4"};base64,${videoPart.data}`;
          res.json({
            success: true,
            videoUrl: videoDataUrl,
            model: "gemini-omni-1.1-flash",
          });
          return;
        }
      } catch (geminiErr: unknown) {
        const notice = geminiErr instanceof Error ? geminiErr.message : "";
        console.info("Gemini Omni Flash unavailable, routing to SAHIN AI Motion Studio:", notice);
      }

      // Signal client-side high-fidelity motion rendering
      res.json({
        success: false,
        fallbackToClientEngine: true,
        motionPrompt: motionPrompt || "Cinematic Camera Motion",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Video route error";
      res.status(500).json({ success: false, fallbackToClientEngine: true, error: msg });
    }
  });

  app.post("/api/generate-speech", async (req: Request, res: Response) => {
    try {
      const { text, voice } = req.body as {
        text?: string;
        voice?: string;
      };

      const rawText = (text || "").trim();
      if (!rawText) {
        res.status(400).json({ success: false, error: "Text is required to generate speech." });
        return;
      }

      // Clean markdown code blocks, links, bullets, and emojis for natural spoken audio
      const cleaned = rawText
        .replace(/```[\s\S]*?```/g, "Code block omitted.")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[*_#~>]/g, "")
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
        .replace(/\s+/g, " ")
        .trim();

      const textToSpeak = cleaned.slice(0, 1500);
      const isBengali = /[\u0980-\u09FF]/.test(textToSpeak);

      // Attempt Gemini 3.8 Flash Lite TTS
      try {
        const ai = getGenAIClient();
        const ttsResponse = await ai.models.generateContent({
          model: "gemini-3.8-flash-lite-tts",
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: textToSpeak,
                  speechMetadata: {
                    style: isBengali
                      ? "Natural, clear, articulate Bengali speaker with warm, friendly tone"
                      : "Warm, clear, and friendly voice assistant",
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice || "Kore" },
              },
            },
          },
        });

        const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          const audioUrl = `data:audio/wav;base64,${base64Audio}`;
          res.json({
            success: true,
            audioUrl,
            format: "audio/wav",
            model: "gemini-3.8-flash-lite-tts",
            cleanText: textToSpeak,
          });
          return;
        }
      } catch (geminiErr: unknown) {
        const notice = geminiErr instanceof Error ? geminiErr.message : "";
        console.info("Gemini TTS service notice, falling back to high-fidelity client voice:", notice);
      }

      // Fallback: Signal client to use Web Speech API with cleanText
      res.json({
        success: false,
        fallbackToBrowserTts: true,
        cleanText: textToSpeak,
        isBengali,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Speech route error";
      res.status(500).json({ success: false, fallbackToBrowserTts: true, error: msg });
    }
  });

  app.post("/api/chat/title", async (req: Request, res: Response) => {
    try {
      const { userMessage, assistantMessage } = req.body as {
        userMessage?: string;
        assistantMessage?: string;
      };

      const seedText = (userMessage || "").trim();
      if (!seedText) {
        res.json({ title: "Visual Analysis" });
        return;
      }

      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: `Generate a concise 3 to 5 word title for this chat: "${seedText.slice(0, 150)}". Return ONLY the plain title without quotes.`,
      });

      const cleaned = (response.text || "")
        .replace(/^["'`]+|["'`]+$/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 60);

      res.json({ title: cleaned || seedText.slice(0, 42) });
    } catch {
      const fallback = String(req.body?.userMessage || "New Conversation")
        .trim()
        .slice(0, 42);
      res.json({ title: fallback || "New Conversation" });
    }
  });


  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SAHIN AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
