import React, { useState, useEffect, useRef } from "react";
import { Search, Mic, MicOff, Sparkles, X } from "lucide-react";

interface SearchBarProps {
  onSearch: (query: string, isAi: boolean) => void;
  isLoading: boolean;
  activeQuery?: string;
  interpretedQuery?: string;
  onClear?: () => void;
}

const MOCK_VOICE_COMMANDS = [
  "spicy street taco options",
  "healthy low calories vegan salad",
  "Mexican traditional soup bowl",
  "espresso cafe mocha sweet drink",
  "something cheesy with high protein",
];

export default function SearchBar({
  onSearch,
  isLoading,
  activeQuery = "",
  interpretedQuery = "",
  onClear,
}: SearchBarProps) {
  const [val, setVal] = useState(activeQuery);
  const [isListening, setIsListening] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep internal state aligned with parent query changes
  useEffect(() => {
    setVal(activeQuery);
  }, [activeQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(val, false);
  };

  const handleMicClick = () => {
    if (isListening) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setIsListening(false);
      return;
    }

    setIsListening(true);
    // Simulate AI voice capturing after 2 seconds
    timerRef.current = setTimeout(() => {
      setIsListening(false);
      const randomPrompt =
        MOCK_VOICE_COMMANDS[Math.floor(Math.random() * MOCK_VOICE_COMMANDS.length)];
      setVal(randomPrompt);
      // Trigger search as an AI semantic search directly
      onSearch(randomPrompt, true);
    }, 2200);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClear = () => {
    setVal("");
    if (onClear) {
      onClear();
    } else {
      onSearch("", false);
    }
  };

  return (
    <div className="sticky top-0 z-50 w-full glass-panel border-b border-white/5 py-4 px-4 shadow-lg transition-all duration-300">
      <div className="max-w-2xl mx-auto w-full flex flex-col gap-2">
        <form onSubmit={handleSubmit} className="relative w-full flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder="Search dishes, tags, ingredients..."
              className="w-full bg-[#111111]/90 text-white placeholder-text-muted text-sm pl-11 pr-10 py-3 rounded-full border border-white/10 outline-none focus:border-accent-brand focus:ring-1 focus:ring-accent-brand/40 transition-all duration-300 shadow-inner"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-accent-brand border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </div>
            {val && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-4 top-1/2 -translate-y-1/2 hover:text-white text-text-muted transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleMicClick}
            className={`
              w-11 h-11 rounded-full flex items-center justify-center border transition-all duration-300 cursor-pointer
              ${
                isListening
                  ? "bg-accent-brand border-accent-brand text-white shadow-lg shadow-accent-brand/50 scale-105 animate-pulse-slow"
                  : "bg-[#111111]/90 border-white/10 hover:border-white/20 text-white hover:bg-[#1a1a1a]"
              }
            `}
            title="AI Voice Search"
          >
            {isListening ? (
              <Mic className="w-4 h-4 text-white" />
            ) : (
              <Mic className="w-4 h-4 text-text-muted hover:text-white transition-colors" />
            )}
          </button>
        </form>

        {/* Listening overlay status */}
        {isListening && (
          <div className="flex items-center gap-2 px-3 py-1 bg-accent-brand/10 border border-accent-brand/20 rounded-lg text-accent-brand text-xs font-medium animate-pulse">
            <span className="flex gap-1 h-3 items-end">
              <span className="w-0.5 bg-accent-brand animate-mic-wave" style={{ animationDelay: "0.1s" }} />
              <span className="w-0.5 bg-accent-brand h-[60%] animate-mic-wave" style={{ animationDelay: "0.3s" }} />
              <span className="w-0.5 bg-accent-brand h-[40%] animate-mic-wave" style={{ animationDelay: "0.5s" }} />
            </span>
            <span>Simulating speech recognition... Talk now</span>
          </div>
        )}

        {/* Intercepted queries visual tag */}
        {!isListening && interpretedQuery && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-info-kcal/10 border border-info-kcal/20 rounded-full text-info-kcal text-xs font-semibold w-fit animate-fade-in shadow-sm shadow-info-kcal/5">
            <Sparkles className="w-3.5 h-3.5 fill-info-kcal/10 shrink-0" />
            <span className="tracking-wide italic">{interpretedQuery}</span>
          </div>
        )}
      </div>
    </div>
  );
}
