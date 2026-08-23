import React from 'react';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { ImageModelType } from '../types';

interface GoogleProgressBarProps {
  isGenerating: boolean;
  completedCount: number;
  totalCount: number;
  statusText?: string;
  selectedModel: ImageModelType;
}

export const GoogleProgressBar: React.FC<GoogleProgressBarProps> = ({
  isGenerating,
  completedCount,
  totalCount,
  statusText,
  selectedModel,
}) => {
  const percentage = Math.round((completedCount / totalCount) * 100);
  const isComplete = completedCount === totalCount;

  const modelDisplayNames: Record<string, string> = {
    'gemini-3.1-flash-image': 'Gemini 3.1 Flash Image (Nano Banana 2)',
    'imagen-3.0-generate-002': 'Google Imagen 3 (Photorealism)',
    'imagen-3.0-fast-generate-001': 'Google Imagen 3 Fast',
    'procedural-diegetic': 'Procedural Diegetic Canvas Engine',
  };

  const humanModelName = modelDisplayNames[selectedModel] || 'Gemini 3.1 Flash Image (Nano Banana 2)';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 transition-colors duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-xl ${
              isComplete
                ? 'bg-emerald-500/15 text-[#34A853]'
                : 'bg-blue-500/15 text-[#4285F4]'
            }`}
          >
            {isComplete ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <RefreshCw className="w-5 h-5 animate-spin" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{isComplete ? 'All 10 Diegetic Shots Ready' : statusText || 'Synthesizing with Gemini 3.1 Flash Image (Nano Banana 2)...'}</span>
              <span className="text-xs text-[#4285F4] font-mono font-semibold">
                ({completedCount}/{totalCount} Completed)
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Active Model: <strong className="text-slate-800 dark:text-slate-200">{humanModelName}</strong> • 35mm Anamorphic Diegetic Number Grounding
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="font-mono text-slate-900 dark:text-white font-extrabold text-base">
            {percentage}%
          </span>
          <span className="block text-[10px] text-slate-400 font-mono">
            {isComplete ? 'Synthesis Done' : 'Live Rendering'}
          </span>
        </div>
      </div>

      {/* Google 4-Color Gradient Progress Track */}
      <div className="w-full h-3 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-800">
        <div
          className="h-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC04] to-[#34A853] transition-all duration-500 rounded-full shadow-md"
          style={{ width: `${Math.max(8, percentage)}%` }}
        />
      </div>
    </div>
  );
};
