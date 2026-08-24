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
        'Enter your customer brand name (e.g. Lufthansa Group, Adidas, Porsche) and industry setting. This anchors the visual style across all 10 scenes.',
    },
    {
      num: 2,
      badge: 'Stage 2',
      title: 'AI Diegetic Prompt Generation',
      icon: <Layers className="w-5 h-5 text-sky-500" />,
      color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30',
      description:
        'Gemini AI creates 10 coordinated prompts. Each countdown number (10 down to 1) is physically embedded into real world objects (etched metal, painted markings, illuminated gauges) with no fake floating graphic overlays.',
    },
    {
      num: 3,
      badge: 'Stage 3',
      title: 'Diegetic Starting Frames (Images)',
      icon: <ImageIcon className="w-5 h-5 text-emerald-500" />,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      description:
        'Generates 16:9 photorealistic starting images for each shot using 2 parallel AI workers. You can accept, redo, or refine any shot with dual-image ingestion.',
    },
    {
      num: 4,
      badge: 'Stage 4',
      title: 'Veo 3 Image-to-Video Motion Synthesis',
      icon: <Film className="w-5 h-5 text-purple-500" />,
      color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
      description:
        'Google Veo 3 takes each starting image as input and synthesizes 4.0s of smooth cinematic camera motion (e.g. push-in zoom, orbital sweep, obstacle reveal) to unveil the diegetic number in motion.',
    },
    {
      num: 5,
      badge: 'Stage 5',
      title: 'Master Concat & Audio Sync Timeline',
      icon: <Download className="w-5 h-5 text-amber-500" />,
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
      description:
        'Preview all 10 clips on the interactive waveform timeline. Export a seamless 30.0s broadcast master video with 1.0s crossfades and a synchronized soundtrack.',
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
                A 5-stage automated AI pipeline for 30-second cinematic brand countdowns.
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

          {/* 5 Stages Flow */}
          <div className="space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              The 5 Creative Stages
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
                <strong>Auto-Save:</strong> All prompts, images, videos, and master timelines are continuously saved to Google Cloud Storage.
              </li>
              <li>
                <strong>Projects Popup:</strong> Click <strong>Projects</strong> in the top header anytime to open past projects, switch between clients, or delete old sessions.
              </li>
              <li>
                <strong>Deep Links:</strong> Share direct project links (e.g. <code className="text-[11px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">?job=...</code>) with colleagues to collaborate on the same countdown.
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 sm:px-8 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end bg-slate-50/50 dark:bg-slate-900/50">
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
