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
          </div>
        </div>

        {/* Quick Accept / Status Button */}
        <div className="flex items-center gap-2.5 self-end sm:self-center">
          <button
            type="button"
            onClick={() => onAccept(slot.index)}
            disabled={!slot.currentImageUri || slot.isImageLoading}
            className={`flex items-center gap-2 py-2 px-5 rounded-2xl text-xs font-bold transition-all shadow-sm ${
              slot.isImageAccepted
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-[#34A853] border border-emerald-300 dark:border-emerald-800'
                : 'bg-[#34A853] hover:bg-emerald-600 active:scale-98 text-white'
            } disabled:opacity-40`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{slot.isImageAccepted ? 'Approved (Ready for Veo 3)' : 'Accept Shot'}</span>
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
                <span>Input Frame (30%)</span>
              </span>
            </div>
            <div className="flex-1 flex items-center justify-center min-h-[180px]">
              <img
                src={imageUrl}
                alt={`Shot ${slot.index} Frame`}
                className="w-full h-full object-contain rounded-xl max-h-56"
              />
            </div>
          </div>

          {/* Right: Veo 3 Video Output (70% Width) with direct HTML5 player */}
          <div className="lg:col-span-7 aspect-video rounded-2xl bg-black border border-[#4285F4]/40 overflow-hidden relative group shadow-2xl flex items-center justify-center">
            <video
              src={videoUrl}
              autoPlay
              loop
              muted
              playsInline
              controls
              className="w-full h-full object-contain bg-black"
            />
            <span className="absolute top-3 right-3 px-3 py-1 rounded-xl bg-slate-900/90 backdrop-blur-md text-white border border-blue-500/40 text-xs font-mono flex items-center gap-1.5 shadow-lg pointer-events-none">
              <Video className="w-3.5 h-3.5 text-[#4285F4]" />
              <span>Veo 3 Video (4.0s - 70%)</span>
            </span>
          </div>
        </div>
      ) : (
        /* Full-Width Image Showcase when video has not yet been rendered */
        <div className="w-full aspect-video rounded-2xl bg-black border border-slate-200 dark:border-slate-800 overflow-hidden relative group shadow-2xl flex items-center justify-center">
          {slot.isImageLoading ? (
            <div className="flex flex-col items-center gap-3 text-[#4285F4] p-8 text-center">
              <RefreshCw className="w-10 h-10 animate-spin text-[#4285F4]" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Synthesizing Shot #{slot.index} with Gemini Nano Banana...
                </p>
                <p className="text-xs text-slate-500">
                  Generating diegetic number '{slot.diegeticNumber}' embedded into {brandName} machinery.
                </p>
              </div>
            </div>
          ) : slot.currentImageUri ? (
            <img
              src={imageUrl}
              alt={`Shot ${slot.index} - ${slot.sceneConcept}`}
              className="w-full h-full object-contain bg-black transition-transform duration-500 group-hover:scale-[1.01]"
            />
          ) : (
            <div className="text-sm text-slate-500 text-center px-4">
              Pending synthesis
            </div>
          )}
        </div>
      )}

      {/* Prompt Details (Expandable) */}
      {slot.imagePrompt && (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#4285F4]" />
              <span>Prompt Used for Generation</span>
            </div>
            <button
              type="button"
              onClick={() => setShowFullPrompt(!showFullPrompt)}
              className="text-xs text-[#4285F4] hover:underline font-semibold flex items-center gap-1"
            >
              <span>{showFullPrompt ? 'Collapse Prompt' : 'View Full Prompt'}</span>
              {showFullPrompt ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p
            className={`text-xs text-slate-600 dark:text-slate-400 font-mono leading-relaxed ${
              showFullPrompt ? '' : 'line-clamp-2'
            }`}
          >
            {slot.imagePrompt}
          </p>
        </div>
      )}

      {/* Card Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onRedo(slot.index)}
            disabled={slot.isImageLoading}
            className="flex items-center gap-1.5 py-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-40"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#4285F4]" />
            <span>Redo Shot</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenRefine(slot)}
            disabled={!slot.currentImageUri || slot.isImageLoading}
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

        {/* Video Generation Trigger */}
        <button
          type="button"
          onClick={() => onGenerateVideo(slot.index)}
          disabled={!slot.currentImageUri || slot.isVideoLoading}
          className="flex items-center gap-2 py-2.5 px-5 rounded-2xl bg-[#4285F4] hover:bg-blue-600 text-white text-xs font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-40"
        >
          {slot.isVideoLoading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Synthesizing Veo 3 Video (No Audio)...</span>
            </>
          ) : (
            <>
              <Video className="w-3.5 h-3.5" />
              <span>{slot.rawVideoUri ? 'Re-Generate Veo 3 Video' : 'Generate Veo 3 Video (4.0s)'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
