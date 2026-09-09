import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  HelpCircle,
  X,
  Sparkles,
  Wand2,
  Image as ImageIcon,
  Film,
  Download,
  FolderOpen,
  CheckCircle2,
  Lightbulb,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const steps = [
    {
      num: 1,
      badge: 'Stage 1',
      title: 'Customer Brand & Aesthetic Direction',
      icon: <Wand2 className="w-5 h-5 text-blue-500" />,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
      description:
        'Enter your customer brand name (e.g. Lufthansa Group, Adidas, Bundesdruckerei) and industry setting, or choose from enterprise presets. This anchors the visual style across all 10 scenes.',
    },
    {
      num: 2,
      badge: 'Stage 2',
      title: 'AI Diegetic Prompt Engineering',
      icon: <Layers className="w-5 h-5 text-sky-500" />,
      color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30',
      description:
        'Gemini AI creates 10 coordinated prompts with physical numeral integration (etched metal, illuminated gauges). Customize prompts inline or tune the system instructions via the Veo 3 Prompt Guide modal.',
    },
    {
      num: 3,
      badge: 'Stage 3',
      title: 'Direct Veo 3.1 Text-to-Video Generation',
      icon: <Film className="w-5 h-5 text-purple-500" />,
      color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
      description:
        'Google Veo 3.1 directly synthesizes 4.0s cinematic motion clips straight from prompts without intermediate starting images. Supports both Veo 3.1 Fast (Turbo) and Veo 3.1 Quality with 1-click bulk generation.',
    },
    {
      num: 4,
      badge: 'Stage 4',
      title: 'Master Concat, Extended Outro & Cloud Persistence',
      icon: <Download className="w-5 h-5 text-emerald-500" />,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      description:
        'Preview on the interactive waveform timeline. Export either a standalone 30s Countdown Master or an Extended Master (+ Google I/O Outro) with a 2-second crossfade transition. All master files are permanently saved to GCS.',
    },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-scaleUp">
        {/* Modal Header */}
        <div className="px-6 sm:px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/60">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#4285F4] border border-blue-200 dark:border-blue-800 shadow-sm">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                How Magic Countdown Generator Works
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                A modernized 4-stage AI pipeline for 30-second cinematic brand countdowns.
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* Intro Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-blue-50/80 via-purple-50/40 to-slate-50 dark:from-blue-950/30 dark:via-purple-950/20 dark:to-slate-900 border border-blue-200/60 dark:border-blue-900/50 space-y-2">
            <div className="flex items-center gap-2 text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>What is a "Diegetic" Countdown?</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              In film theory, <strong>diegetic</strong> elements exist naturally inside the story world. Instead of placing digital text on screen, our countdown numbers (10 down to 1) are physically manufactured into real environment objects (laser-etched titanium, illuminated cockpit dials, painted aircraft wings, stadium seating geometry).
            </p>
          </div>

          {/* 4 Stages Flow */}
          <div className="space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              The 4 Creative Stages
            </h3>

            <div className="space-y-3">
              {steps.map((st) => (
                <div
                  key={st.num}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex items-start gap-4 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm shrink-0 mt-0.5">
                    {st.icon}
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${st.color}`}>
                        {st.badge}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {st.title}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {st.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cloud Storage & Management Tips */}
          <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <FolderOpen className="w-4 h-4 text-[#4285F4]" />
              <span>Multi-User Projects & Cloud Storage</span>
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc list-inside">
              <li>
                <strong>Persistent Master Files:</strong> Master countdown videos are generated once and stored in GCS. Reopening any project instantly reloads the finished video without re-rendering.
              </li>
              <li>
                <strong>Dual Master Choices:</strong> Export either a standalone 30s countdown master or the extended version with the Google I/O outro and 2s crossfade transition.
              </li>
              <li>
                <strong>Customizable Prompt Rules:</strong> Click <strong>Veo 3 Prompt Guide</strong> in the header to view or customize your prompt synthesis directives.
              </li>
              <li>
                <strong>Projects Popup:</strong> Click <strong>Projects</strong> in the header anytime to open past sessions, switch clients, or collaborate via deep links (<code className="text-[11px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">?job=...</code>).
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 sm:px-8 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <a
            href="/specifications/spec_v12.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
          >
            <span>Open Complete Master Spec (v12.0)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all active:scale-95"
          >
            Got It
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
