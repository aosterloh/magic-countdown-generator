import React, { useState, useEffect } from 'react';
import {
  Wand2,
  Sparkles,
  RefreshCw,
  Film,
  Download,
  CheckCircle2,
  Video,
  ChevronRight,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Header } from './components/Header';
import { ThemeInputForm } from './components/ThemeInputForm';
import { PromptReviewList } from './components/PromptReviewList';
import { PromptCarousel } from './components/PromptCarousel';
import { GoogleProgressBar } from './components/GoogleProgressBar';
import { SlotCard } from './components/SlotCard';
import { WaveformTimeline } from './components/WaveformTimeline';
import { RefineModal } from './components/RefineModal';
import { MasterExportModal } from './components/MasterExportModal';
import { GoogleAuthGate } from './components/GoogleAuthGate';
import { CountdownSlot, ImageModelType, AuthMode, SlotTemporalConfig } from './types';
import { UNIVERSAL_STYLE_ANCHOR } from './utils/promptBuilder';
import { calculateTimelineOffsets } from './utils/temporalMath';

const API_BASE = window.location.port === '5173' ? 'http://localhost:3001' : '';

export const App: React.FC = () => {
  // Authentication State: Password Protected Application Access
  const [authUser, setAuthUser] = useState<{ email: string; name: string } | null>(() => {
    try {
      const saved = localStorage.getItem('auth_user');
      if (saved) {
        return JSON.parse(saved);
      }
      return null;
    } catch {
      return null;
    }
  });

  // Theme State: Default to Light Mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme_mode');
    return saved ? saved === 'dark' : false;
  });

  // Settings State: Default to Active Project aosterloh-cs-muc
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('gemini_api_key') || '';
  });
  const [authMode, setAuthMode] = useState<AuthMode>('ADC');
  const [selectedModel, setSelectedModel] = useState<ImageModelType>('gemini-3.1-flash-image');

  // Multi-step Workflow State (1 to 5)
  // Stage 1: Brand & Theme Input Form
  // Stage 2: Review & Edit 10 Diegetic Prompts (PromptReviewList)
  // Stage 3: Generate & Review 10 Diegetic Images (SlotCards with 2 workers)
  // Stage 4: Veo 3 Video & Waveform Timeline
  // Stage 5: Master Export & Player
  const [currentStage, setCurrentStage] = useState<number>(1);
  const [brandName, setBrandName] = useState<string>('Porsche Motorsport');
  const [themeContext, setThemeContext] = useState<string>(
    'Hyper-modern automotive telemetry laboratory, titanium engine components, illuminated carbon fiber cockpit gauge'
  );

  // Countdown Slots (10 down to 1)
  const [slots, setSlots] = useState<CountdownSlot[]>(() =>
    Array.from({ length: 10 }, (_, i) => {
      const idx = 10 - i;
      return {
        index: idx,
        diegeticNumber: idx,
        sceneConcept: `Diegetic scene for #${idx}`,
        imagePrompt: '',
        isPromptApproved: true,
        isPromptRecreating: false,
        currentImageUri: null,
        historyImageUri: null,
        isImageAccepted: false,
        isImageLoading: false,
        imageError: null,
        rawVideoUri: null,
        isVideoLoading: false,
        videoError: null,
        temporalConfig: {
          mode: 'PASSTHROUGH',
          targetDurationSeconds: 3.0,
          trimStartSeconds: 0.0,
          trimEndSeconds: 3.0,
        },
        processedVideoUri: null,
      };
    })
  );

  // Global Loading States
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [isBatchGeneratingImages, setIsBatchGeneratingImages] = useState(false);
  const [generationStatusText, setGenerationStatusText] = useState('');
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Modal States
  const [activeRefineSlot, setActiveRefineSlot] = useState<CountdownSlot | null>(null);
  const [previewVideoUri, setPreviewVideoUri] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExportingMaster, setIsExportingMaster] = useState(false);
  const [masterVideoUri, setMasterVideoUri] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Sync theme with document element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme_mode', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme_mode', 'light');
    }
  }, [isDarkMode]);

  const handleApiKeyChange = (newKey: string) => {
    setApiKey(newKey);
    localStorage.setItem('gemini_api_key', newKey);
  };

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Helper: Bounded Parallel Worker Pool (Concurrency = 2)
  const runWorkerPool = async <T,>(
    items: T[],
    concurrency: number,
    workerFn: (item: T, itemIdx: number) => Promise<boolean>
  ): Promise<boolean> => {
    let cursor = 0;
    let hasFailure = false;

    const worker = async (): Promise<void> => {
      while (cursor < items.length && !hasFailure) {
        const itemIndex = cursor++;
        const item = items[itemIndex];
        const success = await workerFn(item, itemIndex);
        if (!success) {
          hasFailure = true;
          break;
        }
      }
    };

    const workerCount = Math.min(concurrency, items.length);
    const workers = Array.from({ length: workerCount }, () => worker());
    await Promise.all(workers);
    return !hasFailure;
  };

  // 1. Generate Diegetic Prompts for all 10 slots (Stage 1 -> Stage 2)
  const handleGeneratePrompts = async (brand: string, theme: string, styleAnchor: string) => {
    setBrandName(brand);
    setThemeContext(theme);
    setIsGeneratingPrompts(true);
    setGlobalError(null);
    setGenerationStatusText('Synthesizing 10 Diegetic Prompts with Gemini...');

    try {
      const res = await fetch(`${API_BASE}/api/generate-diegetic-prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName: brand, themeContext: theme, apiKey, authMode }),
      });
      const data = await res.json();

      if (data.success && data.prompts) {
        setSlots((prev) =>
          prev.map((slot) => {
            const promptData = data.prompts.find((p: any) => p.diegeticNumber === slot.index);
            return {
              ...slot,
              sceneConcept: promptData?.concept || slot.sceneConcept,
              objectEmbedding: promptData?.objectEmbedding || slot.objectEmbedding,
              revealMechanism: promptData?.revealMechanism || slot.revealMechanism,
              imagePrompt: promptData?.imagePrompt || slot.imagePrompt,
              videoPrompt: promptData?.videoPrompt || slot.videoPrompt,
              isPromptApproved: true,
              isPromptRecreating: false,
            };
          })
        );
        setCurrentStage(2); // Advance to Stage 2: Review & Edit Prompts
      } else {
        setGlobalError(data.error || 'Failed to synthesize prompt concepts');
      }
    } catch (err: any) {
      console.error('Failed to generate prompts:', err);
      setGlobalError(err.message);
    } finally {
      setIsGeneratingPrompts(false);
      setGenerationStatusText('');
    }
  };

  // 2. Prompt Review Handlers (Stage 2)
  const handleUpdatePrompt = (slotIndex: number, newPrompt: string, newConcept?: string, newVideoPrompt?: string) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.index === slotIndex
          ? {
              ...s,
              imagePrompt: newPrompt,
              videoPrompt: newVideoPrompt !== undefined ? newVideoPrompt : s.videoPrompt,
              sceneConcept: newConcept || s.sceneConcept,
              isPromptApproved: true,
            }
          : s
      )
    );
  };

  const handleRecreatePrompt = async (slotIndex: number) => {
    setSlots((prev) =>
      prev.map((s) => (s.index === slotIndex ? { ...s, isPromptRecreating: true } : s))
    );

    try {
      const res = await fetch(`${API_BASE}/api/recreate-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diegeticNumber: slotIndex,
          brandName,
          themeContext,
          apiKey,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setSlots((prev) =>
          prev.map((s) =>
            s.index === slotIndex
              ? {
                  ...s,
                  sceneConcept: data.concept,
                  objectEmbedding: data.objectEmbedding,
                  revealMechanism: data.revealMechanism,
                  imagePrompt: data.imagePrompt,
                  videoPrompt: data.videoPrompt,
                  isPromptApproved: true,
                  isPromptRecreating: false,
                }
              : s
          )
        );
      }
    } catch (err) {
      console.error('Failed to recreate prompt:', err);
      setSlots((prev) =>
        prev.map((s) => (s.index === slotIndex ? { ...s, isPromptRecreating: false } : s))
      );
    }
  };

  const handleToggleApprovePrompt = (slotIndex: number) => {
    setSlots((prev) =>
      prev.map((s) => (s.index === slotIndex ? { ...s, isPromptApproved: !s.isPromptApproved } : s))
    );
  };

  const handleApproveAllPrompts = () => {
    setSlots((prev) => prev.map((s) => ({ ...s, isPromptApproved: true })));
  };

  // Proceed to Image Generation (Stage 2 -> Stage 3 with 2 Workers)
  const handleProceedToImageGeneration = async () => {
    setCurrentStage(3);
    setIsBatchGeneratingImages(true);
    setGlobalError(null);

    const sortedSlots = [...slots].sort((a, b) => b.diegeticNumber - a.diegeticNumber);
    setGenerationStatusText('Synthesizing 10 Diegetic Shots with 2 parallel Gemini Nano Banana workers...');

    await runWorkerPool(sortedSlots, 2, async (slot, idx) => {
      setGenerationStatusText(`Synthesizing Shot #${slot.diegeticNumber} (${idx + 1}/10) with Gemini Nano Banana (2 active workers)...`);
      return await generateImageForSlot(slot.diegeticNumber, slot.imagePrompt, brandName);
    });

    setIsBatchGeneratingImages(false);
    setGenerationStatusText('');
  };

  // Single Slot Image Generation
  const generateImageForSlot = async (slotIndex: number, promptText?: string, brand?: string): Promise<boolean> => {
    setSlots((prev) =>
      prev.map((s) => (s.index === slotIndex ? { ...s, isImageLoading: true, imageError: null } : s))
    );

    const targetSlot = slots.find((s) => s.index === slotIndex);
    const effectivePrompt = promptText || targetSlot?.imagePrompt || '';

    try {
      const res = await fetch(`${API_BASE}/api/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotIndex,
          prompt: effectivePrompt,
          brandName: brand || brandName,
          model: selectedModel,
          apiKey,
          authMode,
        }),
      });
      const data = await res.json();

      if (data.success && data.imageUri) {
        setSlots((prev) =>
          prev.map((s) => {
            if (s.index === slotIndex) {
              return {
                ...s,
                historyImageUri: s.currentImageUri,
                currentImageUri: data.imageUri,
                isImageLoading: false,
                imageError: null,
              };
            }
            return s;
          })
        );
        return true;
      } else {
        const errMsg = data.error || `Failed to generate image for Shot #${slotIndex}`;
        setSlots((prev) =>
          prev.map((s) => (s.index === slotIndex ? { ...s, isImageLoading: false, imageError: errMsg } : s))
        );
        setGlobalError(errMsg);
        return false;
      }
    } catch (err: any) {
      setSlots((prev) =>
        prev.map((s) => (s.index === slotIndex ? { ...s, isImageLoading: false, imageError: err.message } : s))
      );
      setGlobalError(err.message);
      return false;
    }
  };

  // Accept Shot & Auto-Generate Veo 3 Video Immediately
  const handleAcceptShot = async (slotIndex: number) => {
    setSlots((prev) =>
      prev.map((s) => (s.index === slotIndex ? { ...s, isImageAccepted: true } : s))
    );
    await handleGenerateVideoForSlot(slotIndex);
  };

  // Redo Shot
  const handleRedoShot = (slotIndex: number) => {
    generateImageForSlot(slotIndex);
  };

  // Rollback to N-1
  const handleRollbackShot = (slotIndex: number) => {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.index === slotIndex && s.historyImageUri) {
          return {
            ...s,
            currentImageUri: s.historyImageUri,
            historyImageUri: null,
          };
        }
        return s;
      })
    );
  };

  // Refine with custom prompt or 2nd brand reference image
  const handleRefineShot = async (slotIndex: number, customPrompt: string, brandRefFile?: File) => {
    const formData = new FormData();
    formData.append('slotIndex', slotIndex.toString());
    formData.append('customPrompt', customPrompt);
    formData.append('brandName', brandName);
    if (brandRefFile) {
      formData.append('brandReference', brandRefFile);
    }

    setSlots((prev) =>
      prev.map((s) => (s.index === slotIndex ? { ...s, isImageLoading: true } : s))
    );

    try {
      const res = await fetch(`${API_BASE}/api/refine-image`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success && data.imageUri) {
        setSlots((prev) =>
          prev.map((s) => {
            if (s.index === slotIndex) {
              return {
                ...s,
                historyImageUri: s.currentImageUri,
                currentImageUri: data.imageUri,
                brandReferenceImageUri: data.brandReferenceUri,
                imagePrompt: customPrompt,
                isImageLoading: false,
              };
            }
            return s;
          })
        );
      }
    } catch (err) {
      console.error('Failed to refine slot:', err);
    }
  };

  // 3. Generate Veo 3 Video for single slot (No Audio)
  const handleGenerateVideoForSlot = async (slotIndex: number) => {
    const targetSlot = slots.find((s) => s.index === slotIndex);
    if (!targetSlot?.currentImageUri) return;

    setSlots((prev) =>
      prev.map((s) => (s.index === slotIndex ? { ...s, isVideoLoading: true, videoError: null } : s))
    );

    try {
      const res = await fetch(`${API_BASE}/api/generate-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotIndex,
          imageUri: targetSlot.currentImageUri,
        }),
      });
      const data = await res.json();

      if (data.success && data.rawVideoUri) {
        setSlots((prev) =>
          prev.map((s) => (s.index === slotIndex ? { ...s, rawVideoUri: data.rawVideoUri, isVideoLoading: false } : s))
        );
      }
    } catch (err: any) {
      setSlots((prev) =>
        prev.map((s) => (s.index === slotIndex ? { ...s, isVideoLoading: false, videoError: err.message } : s))
      );
    }
  };

  // Batch Generate all 10 Veo 3 videos (2 parallel workers)
  const handleGenerateAllVideos = async () => {
    setCurrentStage(4);
    const slotsWithImages = [...slots].filter((s) => Boolean(s.currentImageUri));
    await runWorkerPool(slotsWithImages, 2, async (s) => {
      await handleGenerateVideoForSlot(s.index);
      return true;
    });
  };

  // 4. Update Temporal Config for Slot
  const handleUpdateTemporalConfig = (slotIndex: number, config: SlotTemporalConfig) => {
    setSlots((prev) =>
      prev.map((s) => (s.index === slotIndex ? { ...s, temporalConfig: config } : s))
    );
  };

  // 5. Trigger Master ffmpeg Export
  const handleExportMaster = async () => {
    setIsExportingMaster(true);
    setExportError(null);

    try {
      const res = await fetch(`${API_BASE}/api/export-master`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotsConfig: slots.map((s) => ({
            index: s.index,
            processedVideoUri: s.processedVideoUri,
            rawVideoUri: s.rawVideoUri,
            temporalConfig: s.temporalConfig,
          })),
        }),
      });
      const data = await res.json();

      if (data.success && data.masterVideoUri) {
        setMasterVideoUri(data.masterVideoUri);
      } else {
        setExportError(data.error || 'Failed to export master video.');
      }
    } catch (err: any) {
      setExportError(err.message);
    } finally {
      setIsExportingMaster(false);
    }
  };

  const imagesCompletedCount = slots.filter((s) => Boolean(s.currentImageUri)).length;
  const allImagesReady = imagesCompletedCount === 10;
  const videosCompletedCount = slots.filter((s) => Boolean(s.rawVideoUri)).length;
  const allVideosReady = videosCompletedCount === 10;
  const generatedSlotsStream = slots.filter((s) => s.currentImageUri || s.isImageLoading);

  const handleAuthenticate = (user: { email: string; name: string }) => {
    const cleanEmail = (user.email || '').trim().toLowerCase();
    if (cleanEmail.endsWith('@cloudspace.goog') || cleanEmail.endsWith('@google.com')) {
      const validUser = { email: cleanEmail, name: user.name || cleanEmail.split('@')[0] };
      setAuthUser(validUser);
      localStorage.setItem('auth_user', JSON.stringify(validUser));
    }
  };

  const handleSignOut = () => {
    setAuthUser(null);
    localStorage.removeItem('auth_user');
  };

  if (!authUser) {
    return <GoogleAuthGate onAuthenticate={handleAuthenticate} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Header */}
      <Header
        apiKey={apiKey}
        onApiKeyChange={handleApiKeyChange}
        authMode={authMode}
        onAuthModeChange={setAuthMode}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        authUser={authUser}
        onSignOut={handleSignOut}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Stepper Progress Indicator (5 Stages) */}
        <div className="flex items-center justify-between max-w-4xl mx-auto px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          {[
            { num: 1, label: '1. Brand & Style' },
            { num: 2, label: '2. Review Prompts' },
            { num: 3, label: '3. Diegetic Images' },
            { num: 4, label: '4. Veo 3 Video' },
            { num: 5, label: '5. Master Export' },
          ].map((st, idx) => (
            <React.Fragment key={st.num}>
              <div className="flex items-center gap-2">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-all ${
                    currentStage >= st.num
                      ? 'bg-[#4285F4] text-white shadow-md shadow-blue-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {currentStage > st.num ? '✓' : st.num}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    currentStage >= st.num
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {st.label}
                </span>
              </div>
              {idx < 4 && (
                <div
                  className={`h-0.5 flex-1 mx-3 rounded transition-all ${
                    currentStage > st.num
                      ? 'bg-[#4285F4]'
                      : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* STAGE 1: Customer Brand & Aesthetic Settings */}
        <ThemeInputForm
          onGeneratePrompts={handleGeneratePrompts}
          isLoading={isGeneratingPrompts}
        />

        {/* STAGE 2: Review & Edit 10 Diegetic Prompts */}
        {currentStage === 2 && (
          <PromptReviewList
            slots={slots}
            brandName={brandName}
            themeContext={themeContext}
            onUpdatePrompt={handleUpdatePrompt}
            onRecreatePrompt={handleRecreatePrompt}
            onToggleApprovePrompt={handleToggleApprovePrompt}
            onApproveAllPrompts={handleApproveAllPrompts}
            onProceedToImageGeneration={handleProceedToImageGeneration}
            isGeneratingImages={isBatchGeneratingImages}
          />
        )}

        {/* STAGE 3: CAROUSEL & PROGRESS BAR & ONE-BY-ONE IMAGE STREAM */}
        {currentStage >= 3 && (
          <section className="space-y-6 animate-fadeIn">
            {/* Error Banner if API credentials or model call fails */}
            {globalError && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between shadow-sm animate-fadeIn">
                <div className="flex items-center gap-2">
                  <span className="font-bold uppercase tracking-wider">Generation Notice:</span>
                  <span>{globalError}</span>
                </div>
                <button
                  type="button"
                  onClick={handleProceedToImageGeneration}
                  className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {/* 1. Rotating Prompt Carousel with Large Number */}
            <PromptCarousel slots={slots} isGenerating={isBatchGeneratingImages} />

            {/* 2. Google Progress Bar Below Carousel */}
            <GoogleProgressBar
              isGenerating={isBatchGeneratingImages || isGeneratingPrompts}
              completedCount={imagesCompletedCount}
              totalCount={10}
              statusText={generationStatusText}
              selectedModel={selectedModel}
            />

            {/* 3. Full-Width Stacked Generated Images Stream */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-[#4285F4]">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Generated Diegetic Shots ({imagesCompletedCount}/10 Completed)
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Images stream in with 2 parallel workers. Accept or refine any shot.
                    </p>
                  </div>
                </div>

                {allImagesReady && currentStage === 3 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStage(4);
                      handleGenerateAllVideos();
                    }}
                    className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-[#34A853] hover:bg-emerald-600 active:scale-98 text-white text-sm font-bold shadow-xl shadow-emerald-500/25 transition-all hover:scale-105"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Approve All 10 Images & Advance to Video Gen</span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>

              {generatedSlotsStream.length > 0 ? (
                <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto">
                  {generatedSlotsStream.map((slot) => (
                    <SlotCard
                      key={slot.index}
                      slot={slot}
                      brandName={brandName}
                      onAccept={handleAcceptShot}
                      onRedo={handleRedoShot}
                      onRollback={handleRollbackShot}
                      onOpenRefine={setActiveRefineSlot}
                      onGenerateVideo={handleGenerateVideoForSlot}
                      onPlayVideo={setPreviewVideoUri}
                    />
                  ))}

                  {/* Prominent Bottom Action Button to continue without scrolling */}
                  {allImagesReady && currentStage === 3 && (
                    <div className="pt-4 pb-2 flex justify-center animate-fadeIn">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStage(4);
                          handleGenerateAllVideos();
                        }}
                        className="w-full max-w-xl flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-[#34A853] hover:bg-emerald-600 active:scale-98 text-white text-base font-bold shadow-2xl shadow-emerald-500/30 transition-all hover:scale-[1.02]"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Approve All 10 Images & Advance to Video Gen</span>
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 animate-pulse">
                  Synthesizing prompt concepts and rendering first diegetic image...
                </div>
              )}
            </div>
          </section>
        )}

        {/* STAGE 4: Veo 3 Video Generation Banner & Action */}
        {currentStage >= 4 && (
          <section className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/40 shadow-xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
                  <Video className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Stage 4: Veo 3 Image-to-Video Synthesis (10 $\times$ 4.0s)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Generates 4-second cinematic clips without audio ({videosCompletedCount}/10 ready).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateAllVideos}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xl shadow-purple-600/20 transition-all hover:scale-105"
              >
                <Sparkles className="w-4 h-4" />
                <span>{allVideosReady ? 'Re-render All 10 Videos' : 'Generate All 10 Veo Videos (2 Workers)'}</span>
              </button>
            </div>
          </section>
        )}

        {/* STAGE 4.1: Interactive Audio-Waveform Timeline */}
        {currentStage >= 4 && (
          <div className="space-y-4 animate-fadeIn">
            <WaveformTimeline
              slots={slots}
              onUpdateSlotTemporalConfig={handleUpdateTemporalConfig}
              audioTrackUri="/countdown/countdown_track.mp3"
            />
          </div>
        )}

        {/* STAGE 5: Export Master Final Assembly Banner */}
        {currentStage >= 4 && (
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950 text-white border border-slate-800 shadow-2xl flex items-center justify-between animate-fadeIn">
            <div className="space-y-1">
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <Film className="w-5 h-5 text-[#4285F4]" />
                <span>Stage 5: Assemble Final 30-Second Master Video</span>
              </h3>
              <p className="text-xs text-slate-300">
                Executes native ffmpeg concatenation with per-clip speed-up/trim transforms and audio sync.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowExportModal(true);
                handleExportMaster();
              }}
              className="flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-[#4285F4] hover:bg-blue-600 text-white font-bold text-sm shadow-xl shadow-blue-500/25 transition-all hover:scale-105 active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Export Master 30s Video</span>
            </button>
          </div>
        )}
      </main>

      {/* Dual-Image Refinement Modal */}
      {activeRefineSlot && (
        <RefineModal
          slot={activeRefineSlot}
          brandName={brandName}
          onClose={() => setActiveRefineSlot(null)}
          onRefine={handleRefineShot}
        />
      )}

      {/* Video Preview Modal */}
      {previewVideoUri && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-4 shadow-2xl space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-900 dark:text-white">Veo 3 Video Preview</span>
              <button
                onClick={() => setPreviewVideoUri(null)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="aspect-video bg-black rounded-2xl overflow-hidden flex items-center justify-center">
              <video src={previewVideoUri} autoPlay loop controls className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      )}

      {/* Master Export Modal */}
      {showExportModal && (
        <MasterExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          masterVideoUri={masterVideoUri}
          isExporting={isExportingMaster}
          totalDuration={30.0}
          error={exportError}
          onExport={handleExportMaster}
        />
      )}
    </div>
  );
};

export default App;
