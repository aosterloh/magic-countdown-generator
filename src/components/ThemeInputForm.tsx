import React, { useState } from 'react';
import { Sparkles, Wand2, RefreshCw, Palette, Info } from 'lucide-react';
import { UNIVERSAL_STYLE_ANCHOR } from '../utils/promptBuilder';

interface ThemeInputFormProps {
  onGeneratePrompts: (brand: string, theme: string, styleAnchor: string, ldap: string) => Promise<void>;
  isLoading: boolean;
  initialBrandName?: string;
  initialThemeContext?: string;
  initialCreatorLdap?: string;
}

export const ThemeInputForm: React.FC<ThemeInputFormProps> = ({
  onGeneratePrompts,
  isLoading,
  initialBrandName = '',
  initialThemeContext = '',
  initialCreatorLdap = '',
}) => {
  const [brandName, setBrandName] = useState(initialBrandName);
  const [themeContext, setThemeContext] = useState(initialThemeContext);
  const [creatorLdap, setCreatorLdap] = useState(initialCreatorLdap);
  const [styleAnchor, setStyleAnchor] = useState(UNIVERSAL_STYLE_ANCHOR);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isBrainstorming, setIsBrainstorming] = useState(false);
  const [brainstormNotice, setBrainstormNotice] = useState<string | null>(null);

  // Sync state if initial props change
  React.useEffect(() => {
    if (initialBrandName !== undefined) setBrandName(initialBrandName);
  }, [initialBrandName]);

  React.useEffect(() => {
    if (initialThemeContext !== undefined) setThemeContext(initialThemeContext);
  }, [initialThemeContext]);

  React.useEffect(() => {
    if (initialCreatorLdap !== undefined && !creatorLdap) setCreatorLdap(initialCreatorLdap);
  }, [initialCreatorLdap]);

  const handleBrainstormIdeas = async () => {
    if (!brandName.trim() || isBrainstorming) return;
    setIsBrainstorming(true);
    setBrainstormNotice(null);
    try {
      const res = await fetch('/api/suggest-brand-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName: brandName.trim() }),
      });
      const data = await res.json();
      if (data.success && data.visualIdeas) {
        setThemeContext(data.visualIdeas);
        const modelDisplay = data.model?.includes('3.7') ? 'Gemini 3.7 Flash (Fallback)' : 'Gemini 3.8 Flash';
        setBrainstormNotice(`✨ Discovered 10 diverse scenes for ${brandName} via ${modelDisplay}! You can review & edit them below.`);
      }
    } catch (err: any) {
      console.warn('Brainstorm error:', err);
    } finally {
      setIsBrainstorming(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim() || !creatorLdap.trim()) return;
    onGeneratePrompts(brandName, themeContext, styleAnchor, creatorLdap.trim());
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
              Configure the customer brand, visual ideas, and your LDAP owner for the 10 countdown scenes.
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

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-5">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Customer / Brand Name <span className="text-rose-500">*</span>
              </label>
              {brandName.trim().length > 0 && (
                <button
                  type="button"
                  onClick={handleBrainstormIdeas}
                  disabled={isBrainstorming}
                  className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center gap-1 transition-all active:scale-95"
                >
                  {isBrainstorming ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Brainstorming...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3 h-3 text-purple-400" />
                      <span>🪄 Auto-Brainstorm 10 Scenes (Gemini 3.8 Flash)</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <input
              type="text"
              required
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Enter customer name, e.g. Infineon, Adidas, Lufthansa..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:border-[#4285F4] focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
            />
          </div>

          <div className="md:col-span-7">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                10 Scenes & Visual Ideas (Freely Editable)
              </label>
              {brandName.trim().length > 0 && (
                <button
                  type="button"
                  onClick={handleBrainstormIdeas}
                  disabled={isBrainstorming}
                  className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-[#4285F4] flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isBrainstorming ? 'animate-spin' : ''}`} />
                  <span>Re-brainstorm</span>
                </button>
              )}
            </div>
            <textarea
              rows={4}
              value={themeContext}
              onChange={(e) => setThemeContext(e.target.value)}
              placeholder="Click 'Auto-Brainstorm 10 Scenes' or type ideas across 4 pillars: Making the product, team coffee/lunch, customer in-use, and logistics..."
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:outline-none focus:border-[#4285F4] focus:ring-2 focus:ring-blue-500/20 transition-all font-sans leading-relaxed"
            />
            {brainstormNotice && (
              <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium mt-1 animate-fadeIn flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>{brainstormNotice}</span>
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-1">
          <div className="md:col-span-12">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Your Name or Initials (Project Owner) <span className="text-rose-500">*</span>
              </label>
              <div className="relative group cursor-pointer" title="This helps identify your own in-progress projects when collaborating with other team members in the shared project list.">
                <Info className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#4285F4] transition-colors" />
              </div>
            </div>
            <input
              type="text"
              required
              value={creatorLdap}
              onChange={(e) => setCreatorLdap(e.target.value)}
              placeholder="e.g. Alex O. or AO"
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:border-[#4285F4] focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
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
                <span>Priming Countdown with Shot #10...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                <span>Start with first number: 10</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
