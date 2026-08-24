import React from 'react';
import { Video, Sparkles, Zap, CheckCircle2, X, ArrowRight } from 'lucide-react';
import { VideoQualityMode } from '../types';

interface VideoQualityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (quality: VideoQualityMode) => void;
  selectedQuality: VideoQualityMode;
}

export const VideoQualityModal: React.FC<VideoQualityModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedQuality,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Choose Veo 3 Video Synthesis Mode
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select your preferred balance between generation speed, cost efficiency, and fidelity.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2 Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Option 1: 720p Fast (Recommended) */}
          <div
            onClick={() => onConfirm('FAST_720P')}
            className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-4 relative ${
              selectedQuality === 'FAST_720P'
                ? 'border-[#4285F4] bg-blue-50/40 dark:bg-blue-950/20 shadow-xl shadow-blue-500/10 ring-2 ring-blue-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-950/60'
            }`}
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-[#34A853] border border-emerald-300 dark:border-emerald-800">
                  ⭐ Recommended (Save Cost)
                </span>
                <Zap className="w-4 h-4 text-emerald-500" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>⚡ 720p Fast Preview</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Uses the high-efficiency Veo 3 fast model for rapid generation across all 10 slots.
              </p>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Cost-efficient & fastest</span>
                </div>
                <div className="text-slate-500 dark:text-slate-400 text-[10px]">
                  💡 You can redo/upgrade to 4K anytime before final video export.
                </div>
              </div>
            </div>

            <button
              type="button"
              className="w-full py-2.5 px-4 rounded-xl bg-[#4285F4] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <span>Produce in 720p Fast</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Option 2: 4K Master */}
          <div
            onClick={() => onConfirm('FULL_4K')}
            className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-4 relative ${
              selectedQuality === 'FULL_4K'
                ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 shadow-xl shadow-amber-500/10 ring-2 ring-amber-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-950/60'
            }`}
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  🌟 Broadcast Master
                </span>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>🌟 4K UHD Master</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Directly synthesizes all 10 clips with the flagship 4K UHD model for maximum broadcast fidelity.
              </p>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ultra-high cinematic fidelity</span>
                </div>
                <div className="text-slate-500 dark:text-slate-400 text-[10px]">
                  Requires more GPU rendering time per clip.
                </div>
              </div>
            </div>

            <button
              type="button"
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <span>Produce in 4K UHD Master</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
