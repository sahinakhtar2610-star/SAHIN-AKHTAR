import React, { useState } from "react";
import { BrandMark } from "./BrandMark";
import { Sparkles, Film, Zap, Globe, ShieldCheck, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const LoginModal: React.FC = () => {
  const { user, loading, login, error } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (loading || user) {
    return null;
  }

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    setLocalError(null);
    try {
      await login();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign in failed";
      if (!msg.includes("popup-closed-by-user")) {
        setLocalError(msg);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-zinc-950/80 backdrop-blur-md select-none animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to SAHIN AI"
    >
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 sm:p-8 flex flex-col items-center text-center overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-teal-500/15 via-blue-500/10 to-transparent pointer-events-none" />

        {/* Brand Logo with Ambient Aura */}
        <div className="relative mb-5 z-10">
          <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-red-500 via-amber-400 via-emerald-400 to-blue-500 opacity-40 blur-lg animate-pulse" />
          <BrandMark size="lg" withGlow />
        </div>

        {/* Title & Multilingual Subtitle */}
        <div className="space-y-1.5 mb-6 z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-[11px] font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider mb-1">
            <Sparkles className="w-3 h-3" />
            <span>SAHIN AI Workspace</span>
          </div>
          
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Welcome to SAHIN AI
          </h2>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            অ্যাপটি চালু করতে আপনার Gmail দিয়ে লগইন করুন
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Sign in with your Google or Gmail account to unlock the full AI workspace
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="w-full grid grid-cols-2 gap-2 mb-6 text-left z-10">
          <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-tight text-zinc-700 dark:text-zinc-300">
              <span className="font-semibold block">2K/4K AI Image</span>
              <span className="text-zinc-400 text-[10px]">অত্যাধুনিক ছবি তৈরি</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 flex items-start gap-2">
            <Film className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-tight text-zinc-700 dark:text-zinc-300">
              <span className="font-semibold block">Photo to Video</span>
              <span className="text-zinc-400 text-[10px]">ফটো থেকে মোশন ভিডিও</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 flex items-start gap-2">
            <Zap className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-tight text-zinc-700 dark:text-zinc-300">
              <span className="font-semibold block">Ultra-Fast Chat</span>
              <span className="text-zinc-400 text-[10px]">তাড়াতাড়ি নির্ভুল উত্তর</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 flex items-start gap-2">
            <Globe className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-tight text-zinc-700 dark:text-zinc-300">
              <span className="font-semibold block">Live Search</span>
              <span className="text-zinc-400 text-[10px]">ওয়েব সোর্স ও রেফারেন্স</span>
            </div>
          </div>
        </div>

        {/* Error notification if any */}
        {(localError || error) && (
          <div className="w-full mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-start gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1 leading-snug">{localError || error}</span>
          </div>
        )}

        {/* Primary Gmail Sign-in Button */}
        <button
          type="button"
          onClick={handleSignIn}
          disabled={isLoggingIn}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 font-semibold text-sm transition-all shadow-lg hover:shadow-xl active:scale-[0.99] disabled:opacity-60 cursor-pointer z-10 group"
        >
          {isLoggingIn ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              {/* Authentic 4-color Google G Mark */}
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Gmail / Google</span>
            </>
          )}
        </button>

        {/* Secure Authentication Note */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 z-10">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>Secure authentication via Google Firebase</span>
        </div>
      </div>
    </div>
  );
};
