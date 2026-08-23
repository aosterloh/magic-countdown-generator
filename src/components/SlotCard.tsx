import React, { useState } from 'react';
import {
  CheckCircle2,
  RotateCcw,
  SlidersHorizontal,
  RefreshCw,
  Video,
  Play,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
} from 'lucide-react';
import { CountdownSlot } from '../types';
import { getMediaUrl } from '../utils/media';

interface SlotCardProps {
  slot: CountdownSlot;
  brandName: string;
  onAccept: (slotIndex: number) => void;
  onRedo: (slotIndex: number) => void;
  onRollback: (slotIndex: number) => void;
  onOpenRefine: (slot: CountdownSlot) => void;
  onGenerateVideo: (slotIndex: number) => void;
  onPlayVideo: (videoUri: string) => void;
}

export const SlotCard: React.FC<SlotCardProps> = ({
  slot,
  brandName,
  onAccept,
  onRedo,
  onRollback,
  onOpenRefine,
  onGenerateVideo,
  onPlayVideo,
}) => {
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  const imageUrl = getMediaUrl(slot.currentImageUri);
  const videoUrl = getMediaUrl(slot.rawVideoUri);

  const numberBadges: Record<number, string> = {
    10: 'bg-[#4285F4] text-white ring-4 ring-blue-500/20',
    9: 'bg-[#EA4335] text-white ring-4 ring-red-500/20',
    8: 'bg-[#FBBC04] text-slate-900 ring-4 ring-amber-500/20',
    7: 'bg-[#34A853] text-white ring-4 ring-emerald-500/20',
    6: 'bg-[#4285F4] text-white ring-4 ring-blue-500/20',
    5: 'bg-[#EA4335] text-white ring-4 ring-red-500/20',
    4: 'bg-[#FBBC04] text-slate-900 ring-4 ring-amber-500/20',
    3: 'bg-[#34A853] text-white ring-4 ring-emerald-500/20',
    2: 'bg-[#4285F4] text-white ring-4 ring-blue-500/20',
    1: 'bg-[#EA4335] text-white ring-4 ring-red-500/20',
  };

  return (
    <div
      className={`w-full bg-white dark:bg-slate-900 border rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 transition-all duration-300 ${
        slot.isImageAccepted
          ? 'border-[#34A853] ring-2 ring-[#34A853]/30 shadow-emerald-500/10'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* Top Header: Diegetic Countdown Number & Concept */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shrink-0 ${
              numberBadges[slot.diegeticNumber] || 'bg-[#4285F4] text-white'
            }`}
          >
            {slot.index < 10 ? `0${slot.index}` : slot.index}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#4285F4] dark:text-blue-400 uppercase tracking-wider">
                Shot #{slot.index} • Countdown {slot.diegeticNumber}
              </span>
              {slot.isImageAccepted && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-[#34A853] border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Approved
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight mt-0.5">
              {slot.sceneConcept || `Diegetic Shot #${slot.index}`}
            </h3>
            {slot.revealMechanism && (
              <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium mt-0.5">
                🎬 Reveal: {slot.revealMechanism}
              </p>
            )}
          </div>
        </div>

        {/* Quick Accept / Auto-Video Button */}
        <div className="flex items-center gap-2.5 self-end sm:self-center">
          <button
            type="button"
            onClick={() => onAccept(slot.index)}
            disabled={!slot.currentImageUri || slot.isImageLoading || slot.isVideoLoading}
            className={`flex items-center gap-2 py-2 px-5 rounded-2xl text-xs font-bold transition-all shadow-sm ${
              slot.rawVideoUri
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-[#34A853] border border-emerald-300 dark:border-emerald-800'
                : slot.isVideoLoading
                ? 'bg-purple-600 text-white animate-pulse'
                : slot.isImageAccepted
                ? 'bg-emerald-600 text-white'
                : 'bg-[#34A853] hover:bg-emerald-600 active:scale-98 text-white shadow-emerald-500/20'
            } disabled:opacity-40`}
          >
            {slot.isVideoLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Synthesizing Veo 3 Video...</span>
              </>
            ) : slot.rawVideoUri ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-[#34A853]" />
                <span>Accepted • Veo 3 Ready</span>
              </>
            ) : slot.isImageAccepted ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Accepted</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Accept Shot</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Center Media Showcase: Side-by-Side (30% Image / 70% Video) or Full-Width Image */}
      {slot.rawVideoUri ? (
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 items-stretch">
          {/* Left: Input Image (30% Width) */}
          <div className="lg:col-span-3 rounded-2xl bg-black border border-slate-200 dark:border-slate-800 overflow-hidden relative group flex flex-col justify-between p-2 shadow-inner">
            <div className="flex items-center justify-between px-2 py-1 z-10">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-900/90 text-slate-300 border border-slate-700 flex items-center gap-1">
                <ImageIcon className="w-3 h-3 text-[#4285F4]" />
                <span>Starting Frame (30%)</span>
              </span>
            </div>
            <div className="flex-1 flex items-center justify-center min-h-[180px]">
              <img
                src={imageUrl}
                alt={`Diegetic shot #${slot.index}`}
                className="max-h-[220px] w-full object-contain rounded-xl"
              />
            </div>
          </div>

          {/* Right: Veo 3 Video Player (70% Width) */}
          <div className="lg:col-span-7 rounded-2xl bg-black border border-purple-500/30 overflow-hidden relative flex flex-col justify-between p-2 shadow-xl">
            <div className="flex items-center justify-between px-2 py-1 z-10">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-900/90 text-purple-200 border border-purple-700 flex items-center gap-1">
                <Video className="w-3 h-3 text-purple-400" />
                <span>Veo 3 Reveal Video (70% Focus)</span>
              </span>
              <button
                type="button"
                onClick={() => onPlayVideo(slot.rawVideoUri!)}
                className="text-[11px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 bg-purple-950/60 px-2 py-0.5 rounded-lg border border-purple-800"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Fullscreen</span>
              </button>
            </div>
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
              <video
                src={videoUrl}
                autoPlay
                loop
                muted
                playsInline
                controls
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full rounded-2xl bg-black border border-slate-200 dark:border-slate-800 overflow-hidden relative group">
          <div className="aspect-video w-full flex items-center justify-center bg-slate-950">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={`Diegetic shot #${slot.index}`}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center p-8 space-y-2 text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#4285F4]" />
                <p className="text-xs font-mono">Synthesizing Shot #{slot.index} with Gemini Nano Banana...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Prompt Details (Expandable) */}
      {(slot.imagePrompt || slot.videoPrompt) && (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#4285F4]" />
              <span>Coordinated Prompts (Image Framing & Video Reveal)</span>
            </div>
            <button
              type="button"
              onClick={() => setShowFullPrompt(!showFullPrompt)}
              className="text-xs text-[#4285F4] hover:underline font-semibold flex items-center gap-1"
            >
              <span>{showFullPrompt ? 'Collapse Details' : 'View Prompts'}</span>
              {showFullPrompt ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className={`space-y-2.5 ${showFullPrompt ? '' : 'line-clamp-2'}`}>
            {slot.imagePrompt && (
              <div>
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-0.5">
                  1. Starting Image Prompt:
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-mono leading-relaxed">
                  {slot.imagePrompt}
                </p>
              </div>
            )}
            {slot.videoPrompt && (
              <div>
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block mb-0.5">
                  2. Coordinated Veo 3 Motion (Number Reveal):
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-mono leading-relaxed">
                  {slot.videoPrompt}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Card Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onRedo(slot.index)}
            disabled={slot.isImageLoading || slot.isVideoLoading}
            className="flex items-center gap-1.5 py-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-40"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#4285F4]" />
            <span>Redo Shot</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenRefine(slot)}
            disabled={!slot.currentImageUri || slot.isImageLoading || slot.isVideoLoading}
            className="flex items-center gap-1.5 py-2.5 px-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/60 text-[#4285F4] dark:text-blue-300 text-xs font-semibold border border-blue-200 dark:border-blue-800/80 transition-colors disabled:opacity-40"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>2-Image Dual Ingestion Refine</span>
          </button>

          {Boolean(slot.historyImageUri) && (
            <button
              type="button"
              onClick={() => onRollback(slot.index)}
              className="flex items-center gap-1.5 py-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-400 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Rollback (N-1)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
