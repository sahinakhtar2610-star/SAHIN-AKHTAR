/**
 * Speech & Voice Synthesis Utility for SAHIN AI.
 * Dual-engine architecture:
 * 1. Server-side Gemini 3.8 Flash Lite TTS (crystal-clear studio audio/wav)
 * 2. Client-side Web Speech API fallback (zero-latency native Bengali & English speech)
 */

let currentAudio: HTMLAudioElement | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let activeSpeakerId: string | null = null;
let activeListeners: Set<(speakerId: string | null) => void> = new Set();

export function subscribeSpeechState(listener: (speakerId: string | null) => void) {
  activeListeners.add(listener);
  listener(activeSpeakerId);
  return () => {
    activeListeners.delete(listener);
  };
}

function notifyState(speakerId: string | null) {
  activeSpeakerId = speakerId;
  for (const listener of activeListeners) {
    listener(speakerId);
  }
}

export function cleanTextForSpeech(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/```[\s\S]*?```/g, "Code block omitted.")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_#~>•\-]/g, " ")
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function stopAllSpeech(): void {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {
      // Ignore
    }
    currentAudio = null;
  }

  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore
    }
    currentUtterance = null;
  }

  notifyState(null);
}

export function isSpeakingMessage(id: string): boolean {
  return activeSpeakerId === id;
}

export async function speakAssistantText(
  speakerId: string,
  text: string,
  options: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: unknown) => void;
  } = {}
): Promise<void> {
  // If this message is already speaking, stop it (toggle off)
  if (activeSpeakerId === speakerId) {
    stopAllSpeech();
    options.onEnd?.();
    return;
  }

  // Stop any previous audio
  stopAllSpeech();

  const cleaned = cleanTextForSpeech(text);
  if (!cleaned) {
    options.onEnd?.();
    return;
  }

  notifyState(speakerId);
  options.onStart?.();

  // 1. Try server-side Gemini 3.8 Flash Lite TTS
  try {
    const res = await fetch("/api/generate-speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: cleaned.slice(0, 1200) }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.audioUrl) {
        const audio = new Audio(data.audioUrl);
        currentAudio = audio;

        audio.onended = () => {
          if (activeSpeakerId === speakerId) {
            stopAllSpeech();
            options.onEnd?.();
          }
        };

        audio.onerror = () => {
          // Fall back to client synthesis if audio play fails
          fallbackToBrowserSpeech(speakerId, cleaned, options);
        };

        await audio.play();
        return;
      }
    }
  } catch (err) {
    console.warn("Server TTS notice, falling back to browser speech engine:", err);
  }

  // 2. Client-side Web Speech fallback (guarantees voice output in all environments)
  fallbackToBrowserSpeech(speakerId, cleaned, options);
}

function fallbackToBrowserSpeech(
  speakerId: string,
  text: string,
  options: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: unknown) => void;
  }
) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    notifyState(null);
    options.onEnd?.();
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const isBengali = /[\u0980-\u09FF]/.test(text);

    const utterance = new SpeechSynthesisUtterance(text.slice(0, 2000));
    utterance.rate = isBengali ? 0.95 : 1.0;
    utterance.pitch = 1.0;
    utterance.lang = isBengali ? "bn-BD" : "en-US";

    // Attempt to pick matching language voice
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      if (isBengali) {
        const bnVoice = voices.find(
          (v) => v.lang.startsWith("bn") || v.lang.includes("Bengali") || v.name.includes("Bangla")
        );
        if (bnVoice) utterance.voice = bnVoice;
      } else {
        const enVoice = voices.find(
          (v) => (v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google") || v.default))
        );
        if (enVoice) utterance.voice = enVoice;
      }
    }

    utterance.onstart = () => {
      notifyState(speakerId);
    };

    utterance.onend = () => {
      if (activeSpeakerId === speakerId) {
        stopAllSpeech();
        options.onEnd?.();
      }
    };

    utterance.onerror = (e) => {
      console.warn("Speech synthesis notice:", e);
      stopAllSpeech();
      options.onError?.(e);
      options.onEnd?.();
    };

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  } catch (synthErr) {
    stopAllSpeech();
    options.onError?.(synthErr);
    options.onEnd?.();
  }
}
