import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Globe,
  Film,
  ArrowRight,
  Tv,
  ExternalLink,
} from 'lucide-react';

interface WelcomeGuideModalProps {
  isOpen: boolean;
  onClose: (dontShowAgain?: boolean) => void;
}

export const WelcomeGuideModal: React.FC<WelcomeGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose(dontShowAgain);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, dontShowAgain, onClose]);

  if (!isOpen) return null;

  const handleDismiss = () => {
    onClose(dontShowAgain);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      {/* Google Blue Background Container */}
      <div
        className="relative w-full max-w-2xl bg-gradient-to-br from-[#1a73e8] via-[#1557b0] to-[#0d47a1] text-white rounded-3xl shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Decorative Ambient Glows */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative p-6 sm:p-7 border-b border-white/15 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shadow-inner shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-[11px] font-bold tracking-wide uppercase mb-1">
                <span>Quick Tour</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                How Magic Countdown Works
              </h2>
              <p className="text-xs sm:text-sm text-blue-100/90 mt-0.5">
                Create a high-impact 30-second or 2-minute video in 3 simple steps
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/15 transition-all cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 3 Simple Steps */}
        <div className="p-6 sm:p-7 overflow-y-auto space-y-4 text-white">
          {/* Step 1 */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/15 transition-all flex gap-4 items-start">
            <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0 font-extrabold text-base shadow-sm">
              1
            </div>
            <div className="space-y-1 text-left flex-1">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-200" />
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Enter Customer URL &amp; Live Research
                </h3>
              </div>
              <p className="text-xs text-blue-100 leading-relaxed">
                Paste the customer's website URL (e.g. <span className="font-mono bg-white/15 px-1.5 py-0.5 rounded text-white font-bold">madsack.de</span>). The app researches the company in real-time, extracts brand identity and corporate colors, then drafts 10 bespoke countdown concepts from 10 down to 1.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/15 transition-all flex gap-4 items-start">
            <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0 font-extrabold text-base shadow-sm">
              2
            </div>
            <div className="space-y-1 text-left flex-1">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-amber-200" />
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Generate &amp; Perfect 10 Scenes
                </h3>
              </div>
              <p className="text-xs text-blue-100 leading-relaxed">
                Batch-generate 10 cinematic motion scenes. You have full creative control: adjust direction, customize visual styles, and generate new takes for any scene until every countdown number looks flawless.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/15 transition-all flex gap-4 items-start">
            <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0 font-extrabold text-base shadow-sm">
              3
            </div>
            <div className="space-y-1 text-left flex-1">
              <div className="flex items-center gap-2">
                <Tv className="w-4 h-4 text-emerald-200" />
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Export Your Final Cut & Full Video
                </h3>
              </div>
              <p className="text-xs text-blue-100 leading-relaxed">
                Choose between the standalone <strong className="text-white font-bold">30-second countdown video</strong> (timed to high-tempo music with a dramatic 1-second drop pause) or the full <strong className="text-white font-bold">2-minute extended version</strong> featuring the inspirational 90-second{' '}
                <a
                  href="https://www.youtube.com/watch?v=wYSncx9zLIU"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-white font-bold inline-flex items-center gap-0.5 text-white/95"
                >
                  <span>Event Opening Video</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                . Export instantly in Fast Preview or Studio 4K Ultra HD.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer: Decline preference & Start Button */}
        <div className="relative p-5 sm:p-6 bg-black/20 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Don't show again checkbox */}
          <label className="flex items-center gap-2.5 text-xs text-blue-100 select-none cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded border-white/40 text-blue-600 focus:ring-white/30 bg-white/20 cursor-pointer"
            />
            <span>Don't show this welcome guide again</span>
          </label>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleDismiss}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white hover:bg-blue-50 text-[#1a73e8] font-bold text-xs shadow-lg shadow-black/20 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
