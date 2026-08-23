import React, { useState } from 'react';
import { Sparkles, Wand2, RefreshCw, Palette } from 'lucide-react';
import { UNIVERSAL_STYLE_ANCHOR } from '../utils/promptBuilder';

interface ThemeInputFormProps {
  onGeneratePrompts: (brand: string, theme: string, styleAnchor: string) => Promise<void>;
  isLoading: boolean;
}

export const ThemeInputForm: React.FC<ThemeInputFormProps> = ({
  onGeneratePrompts,
  isLoading,
}) => {
  const [brandName, setBrandName] = useState('Lufthansa Group');
  const [themeContext, setThemeContext] = useState(
    'Aviation excellence across aircraft hangar, flight crew preparations, wet runway operations, golden hour takeoff, first-class passengers, and turbofan engine maintenance'
  );
  const [styleAnchor, setStyleAnchor] = useState(UNIVERSAL_STYLE_ANCHOR);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) return;
    onGeneratePrompts(brandName, themeContext, styleAnchor);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 transition-colors duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-[#4285F4]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Step 1: Customer Brand & Aesthetic Direction
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure the customer brand and setting for the 10 diegetic countdown scenes.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-slate-500 dark:text-slate-400 hover:text-[#4285F4] flex items-center gap-1.5 transition-colors font-medium"
        >
          <Palette className="w-3.5 h-3.5" />
          <span>{showAdvanced ? 'Hide Style Anchor' : 'Customize Visual Anchor'}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Customer / Brand Name
            </label>
            <input
              type="text"
              required
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g. Porsche Motorsport, Google Cloud, McLaren"
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-[#4285F4] focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Industry / Setting / Visual Ideas
            </label>
            <input
              type="text"
              value={themeContext}
              onChange={(e) => setThemeContext(e.target.value)}
              placeholder="e.g. Autonomous aerospace wind tunnel, titanium engine gauges"
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-[#4285F4] focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
        </div>

        {showAdvanced && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2 animate-fadeIn">
            <label className="block text-xs font-bold text-[#4285F4] uppercase tracking-wider">
              Universal Visual Style Anchor (Repeated across all 10 shots)
            </label>
            <textarea
              rows={2}
              value={styleAnchor}
              onChange={(e) => setStyleAnchor(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 font-mono focus:outline-none focus:border-[#4285F4]"
            />
            <p className="text-[11px] text-slate-500">
              This invariant guarantees cinematic cohesion across all 10 independent generations.
            </p>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#4285F4] hover:bg-blue-600 active:scale-98 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2.5 transition-all"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Synthesizing 10 Text Prompts...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                <span>Generate 10 Text Prompts</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
