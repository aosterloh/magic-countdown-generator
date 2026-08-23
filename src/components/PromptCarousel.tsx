import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Pause, Play } from 'lucide-react';
import { CountdownSlot } from '../types';

interface PromptCarouselProps {
  slots: CountdownSlot[];
  isGenerating: boolean;
}

export const PromptCarousel: React.FC<PromptCarouselProps> = ({ slots, isGenerating }) => {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const activeSlotsWithPrompts = slots.filter((s) => s.imagePrompt || s.sceneConcept);
  const displaySlots = activeSlotsWithPrompts.length > 0 ? activeSlotsWithPrompts : slots;

  // Autoscroll every 10 seconds (unless paused by user)
  useEffect(() => {
    if (isPaused) return;

    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % displaySlots.length);
    }, 10000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [displaySlots.length, isPaused]);

  const currentSlot = displaySlots[activeIndex] || displaySlots[0];

  const numberColors: Record<number, { text: string; bg: string; border: string }> = {
    10: { text: 'text-[#4285F4]', bg: 'bg-[#4285F4]/10', border: 'border-[#4285F4]/30' },
    9: { text: 'text-[#EA4335]', bg: 'bg-[#EA4335]/10', border: 'border-[#EA4335]/30' },
    8: { text: 'text-[#FBBC04]', bg: 'bg-[#FBBC04]/10', border: 'border-[#FBBC04]/30' },
    7: { text: 'text-[#34A853]', bg: 'bg-[#34A853]/10', border: 'border-[#34A853]/30' },
    6: { text: 'text-[#4285F4]', bg: 'bg-[#4285F4]/10', border: 'border-[#4285F4]/30' },
    5: { text: 'text-[#EA4335]', bg: 'bg-[#EA4335]/10', border: 'border-[#EA4335]/30' },
    4: { text: 'text-[#FBBC04]', bg: 'bg-[#FBBC04]/10', border: 'border-[#FBBC04]/30' },
    3: { text: 'text-[#34A853]', bg: 'bg-[#34A853]/10', border: 'border-[#34A853]/30' },
    2: { text: 'text-[#4285F4]', bg: 'bg-[#4285F4]/10', border: 'border-[#4285F4]/30' },
    1: { text: 'text-[#EA4335]', bg: 'bg-[#EA4335]/10', border: 'border-[#EA4335]/30' },
  };

  const currentColors = numberColors[currentSlot.diegeticNumber] || numberColors[10];

  return (
    <div
      className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl transition-colors duration-200 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Top Header: Navigation & 10s Timer Indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-[#4285F4]">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Diegetic Scene Prompts (Autoscrolling 10s)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs transition-colors"
            title={isPaused ? 'Resume 10s Autoscroll' : 'Pause Autoscroll'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                setActiveIndex((prev) => (prev === 0 ? displaySlots.length - 1 : prev - 1))
              }
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setActiveIndex((prev) => (prev + 1) % displaySlots.length)}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Carousel Slide Content */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
        {/* Giant Representation of the Countdown Number */}
        <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 text-center">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold mb-1">
            Countdown Step
          </span>
          <div
            className={`text-7xl sm:text-8xl font-black font-mono tracking-tighter ${currentColors.text} drop-shadow-sm select-none`}
          >
            {currentSlot.diegeticNumber}
          </div>
          <span
            className={`mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${currentColors.bg} ${currentColors.text} ${currentColors.border} border`}
          >
            Diegetic Number #{currentSlot.diegeticNumber}
          </span>
        </div>

        {/* Prompt Description & Enriched Scene Details */}
        <div className="md:col-span-3 space-y-3">
          <div>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
              {currentSlot.sceneConcept || `Scene Concept for Shot #${currentSlot.diegeticNumber}`}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Physical Number Embedding: The number "{currentSlot.diegeticNumber}" is naturally integrated into the object geometry.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-mono leading-relaxed max-h-32 overflow-y-auto">
            {currentSlot.imagePrompt || 'Generating Gemini prompt...'}
          </div>
        </div>
      </div>

      {/* 10 Indicator Dots */}
      <div className="flex items-center justify-center gap-1.5 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80">
        {displaySlots.map((s, idx) => {
          const isCurrent = idx === activeIndex;
          return (
            <button
              key={s.index}
              onClick={() => setActiveIndex(idx)}
              className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all ${
                isCurrent
                  ? 'bg-[#4285F4] text-white shadow-md shadow-blue-500/20 scale-105'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {s.diegeticNumber}
            </button>
          );
        })}
      </div>
    </div>
  );
};
