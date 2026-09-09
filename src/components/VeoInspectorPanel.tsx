import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { CountdownSlot, VideoQualityMode } from '../types';
import { getMediaUrl } from '../utils/media';

interface VeoInspectorPanelProps {
  slot: CountdownSlot;
  onAnalyzeVideo: (slotIndex: number) => void;
  onApplyPromptFixAndRegenerate: (slotIndex: number, fixPrompt: string) => void;
  selectedVideoQuality?: VideoQualityMode;
}

export const VeoInspectorPanel: React.FC<VeoInspectorPanelProps> = ({
  slot,
  onAnalyzeVideo,
  onApplyPromptFixAndRegenerate,
}) => {
  const analysis = slot.videoAnalysis;
  const isAnalyzing = slot.isAnalyzingVideo;

  if (!slot.rawVideoUri && !slot.processedVideoUri) {
    return null;
  }

  const isPassed = analysis?.hasCorrectNumber && (analysis?.score ?? 0) >= 7;

  return (
    <div className="mt-3 p-3.5 rounded-2xl bg-slate-900/90 dark:bg-slate-950/90 border border-slate-700/60 dark:border-slate-800 shadow-xl overflow-hidden text-slate-200">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-100 flex items-center gap-1">
                <span>Veo AI Quality Inspector</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Gemini 3.8 Flash
                </span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Multimodal verification of Numeral &apos;{slot.diegeticNumber}&apos; across 4-second sequence
            </p>
          </div>
        </div>

        {/* Action / Grade Badge */}
        <div className="flex items-center gap-2">
          {analysis ? (
            <div className="flex items-center gap-1.5">
              <span
                className={`text-xs font-bold font-mono px-2.5 py-1 rounded-lg border flex items-center gap-1.5 shadow-sm ${
                  isPassed
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                }`}
              >
                {isPassed ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Score: {analysis.score}/10 (Verified)</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    <span>Score: {analysis.score}/10 (Number Missing/Unclear)</span>
                  </>
                )}
              </span>

              <button
                type="button"
                onClick={() => onAnalyzeVideo(slot.index)}
                disabled={isAnalyzing}
                title="Re-inspect frames with Gemini 3.8 Flash"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin text-purple-400' : ''}`} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onAnalyzeVideo(slot.index)}
              disabled={isAnalyzing}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-500/20 transition active:scale-95 disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Inspecting 4 Frames...</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>🤖 Grade with AI Inspector</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Frame Filmstrip: 4 Sequential 1-Second Keyframes */}
      {analysis?.frameUris && analysis.frameUris.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>4-Second Keyframe Sequence</span>
            <span className="text-slate-500 font-normal">Frames extracted at t = 0.5s, 1.5s, 2.5s, 3.5s</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {analysis.frameUris.map((uri, idx) => {
              const secondsLabels = ['0.5s (Context)', '1.5s (Motion)', '2.5s (Zoom)', '3.5s (Hero Lock)'];
              const isHeroFrame = idx >= 2;
              return (
                <div
                  key={idx}
                  className={`rounded-xl overflow-hidden border bg-black relative group shadow-sm ${
                    isHeroFrame && !isPassed
                      ? 'border-rose-500/40 ring-1 ring-rose-500/20'
                      : isHeroFrame && isPassed
                      ? 'border-emerald-500/40 ring-1 ring-emerald-500/20'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="aspect-video w-full bg-slate-950 flex items-center justify-center">
                    <img
                      src={getMediaUrl(uri)}
                      alt={`Frame sec ${idx + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 backdrop-blur-xs px-1.5 py-0.5 text-[9px] font-mono text-center text-slate-300 border-t border-slate-800/60">
                    <span>{secondsLabels[idx]}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Assessment Critique & 1-Click Fix */}
      {analysis && (
        <div className="mt-3 space-y-2.5">
          {/* Critique Box */}
          <div
            className={`p-2.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
              isPassed
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
            }`}
          >
            {isPassed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
            )}
            <div>
              <span className="font-bold block">
                {isPassed
                  ? `Verified: Numeral '${slot.diegeticNumber}' clearly rendered in final seconds.`
                  : `Attention Required: Numeral '${slot.diegeticNumber}' was not detected in final frames.`}
              </span>
              <p className="mt-0.5 opacity-90 text-[11.5px]">{analysis.critique}</p>
              
              {/* OCR Transparency Details */}
              <div className="mt-2 pt-2 border-t border-slate-700/50 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono">
                <span className="flex items-center gap-1">
                  <span className="text-slate-400">OCR Read:</span>
                  <span className={`px-1.5 py-0.5 rounded font-bold ${
                    analysis.exactCharactersRead && new RegExp(`\\b${slot.diegeticNumber}\\b`).test(analysis.exactCharactersRead)
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {analysis.exactCharactersRead ? `"${analysis.exactCharactersRead}"` : 'NONE'}
                  </span>
                </span>
                {analysis.characterLocation && (
                  <span className="flex items-center gap-1 text-slate-400">
                    <span>Location:</span>
                    <span className="text-slate-200">{analysis.characterLocation}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 1-Click AI Self-Improvement Recommendation */}
          {!isPassed && analysis.suggestedPromptFix && (
            <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/40 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>AI Suggested Prompt Fix (High-Contrast Numeral Priority):</span>
                </span>
                <span className="text-[10px] font-mono text-indigo-400">1-Click Regeneration</span>
              </div>

              <div className="p-2 rounded-lg bg-slate-950/80 border border-indigo-500/20 font-mono text-[11px] text-slate-300 leading-relaxed">
                {analysis.suggestedPromptFix}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => onApplyPromptFixAndRegenerate(slot.index, analysis.suggestedPromptFix!)}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-500/25 transition active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>🪄 Apply Fix & Re-synthesize Video</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
