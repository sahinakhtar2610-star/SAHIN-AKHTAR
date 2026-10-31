import React, { useEffect, useState } from "react";
import { LOGO_URL } from "./BrandMark";
import { Sparkles } from "lucide-react";

interface AppSplashScreenProps {
  onComplete: () => void;
  durationMs?: number;
}

export const AppSplashScreen: React.FC<AppSplashScreenProps> = ({
  onComplete,
  durationMs = 2000,
}) => {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);

  const statusMessages = [
    "Initializing SAHIN AI Neural Core...",
    "Loading Vision & Knowledge Models...",
    "Ready to Assist!",
  ];

  useEffect(() => {
    // Start progress bar animation immediately
    const startTimeout = setTimeout(() => {
      setProgress(100);
    }, 50);

    // Update status text in stages
    const t1 = setTimeout(() => setStatusIndex(1), durationMs * 0.38);
    const t2 = setTimeout(() => setStatusIndex(2), durationMs * 0.78);

    // Initiate fade-out at durationMs
    const fadeTimeout = setTimeout(() => {
      setIsFadingOut(true);
    }, durationMs);

    // Unmount and notify parent after fade-out transition finishes (350ms)
    const completeTimeout = setTimeout(() => {
      onComplete();
    }, durationMs + 350);

    return () => {
      clearTimeout(startTimeout);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(fadeTimeout);
      clearTimeout(completeTimeout);
    };
  }, [durationMs, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center select-none bg-zinc-950 text-white transition-all duration-350 ease-out ${
        isFadingOut
          ? "opacity-0 scale-105 pointer-events-none"
          : "opacity-100 scale-100"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Loading SAHIN AI"
    >
      {/* Ambient Radial Gradient Background matching Logo Colors */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-gradient-to-tr from-red-600/20 via-amber-500/15 via-emerald-500/20 to-blue-600/25 blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full bg-blue-500/15 blur-2xl" />
      </div>

      {/* Main Animated Content */}
      <div className="relative z-10 flex flex-col items-center px-6 max-w-sm text-center">
        {/* Animated Logo Container with Glow & Breathing Effect */}
        <div className="relative mb-6 group">
          {/* Multi-color ambient aura */}
          <div className="absolute -inset-3 rounded-full bg-gradient-to-tr from-red-500 via-amber-400 via-emerald-400 to-blue-500 opacity-60 blur-xl animate-spin [animation-duration:8s]" />
          
          {/* Logo Frame */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden bg-white p-2.5 shadow-2xl border-2 border-white/20 transform transition-transform duration-700 ease-out hover:scale-105">
            <img
              src={LOGO_URL}
              alt="SAHIN AI Logo"
              className="w-full h-full object-contain"
              draggable={false}
            />
          </div>

          {/* Sparkle badge */}
          <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-tr from-amber-400 to-red-500 flex items-center justify-center text-white shadow-lg animate-bounce [animation-duration:2.5s]">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Brand Name */}
        <div className="space-y-1.5 mb-6">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-100 via-white to-zinc-300 bg-clip-text text-transparent">
            SAHIN AI
          </h1>
          <p className="text-xs sm:text-sm font-medium text-zinc-400 tracking-wide uppercase">
            Intelligent Conversational Workspace
          </p>
        </div>

        {/* Progress Bar (Smooth 2-second fill) */}
        <div className="w-64 sm:w-72 space-y-2.5">
          <div className="w-full h-1.5 rounded-full bg-zinc-800/90 overflow-hidden p-0.5 border border-zinc-700/50 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-400 via-emerald-400 to-blue-500 transition-all ease-out"
              style={{
                width: `${progress}%`,
                transitionDuration: `${durationMs}ms`,
              }}
            />
          </div>

          {/* Stage Status Indicator */}
          <div className="h-5 flex items-center justify-center">
            <p className="text-xs text-zinc-400/90 font-mono transition-opacity duration-300">
              {statusMessages[statusIndex]}
            </p>
          </div>
        </div>
      </div>

      {/* Subtle bottom credit */}
      <div className="absolute bottom-6 text-[11px] text-zinc-500 font-medium tracking-wider">
        <span>POWERED BY SAHIN AI</span>
      </div>
    </div>
  );
};
