import React, { useState, useEffect, useRef } from 'react';
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
import { CountdownSlot, ImageModelType, AuthMode, SlotTemporalConfig, VideoQualityMode, JobSummary } from './types';
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

  // Persistent GCS Multi-User Job Management State
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobsList, setJobsList] = useState<JobSummary[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Settings State: Default to Active Project aosterloh-cs-muc
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('gemini_api_key') || '';
  });
  const [authMode, setAuthMode] = useState<AuthMode>('ADC');
  const [selectedModel, setSelectedModel] = useState<ImageModelType>('gemini-3.1-flash-image');
  const [selectedVideoQuality, setSelectedVideoQuality] = useState<VideoQualityMode>('FAST_720P');

  // Multi-step Workflow State (1 to 5)
  const [currentStage, setCurrentStage] = useState<number>(1);
  const [brandName, setBrandName] = useState<string>('Lufthansa Group');
  const [themeContext, setThemeContext] = useState<string>(
    'Aviation excellence across aircraft hangar, flight crew preparations, wet runway operations, golden hour takeoff, first-class passengers, and turbofan engine maintenance'
  );
  const [styleModifiers, setStyleModifiers] = useState<string>('');

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

  // GCS Job Management Handlers
  const fetchJobsList = async () => {
    setIsLoadingJobs(true);
    try {
      const res = await fetch(`${API_BASE}/api/jobs`);
      const data = await res.json();
      if (data.success && data.jobs) {
        setJobsList(data.jobs);
        return data.jobs as JobSummary[];
      }
    } catch (e) {
      console.warn('Failed to fetch jobs from GCS:', e);
    } finally {
      setIsLoadingJobs(false);
    }
    return [];
  };

  const loadJob = async (jobIdToLoad: string) => {
    setIsLoadingJobs(true);
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${jobIdToLoad}`);
      const data = await res.json();
      if (data.success && data.job) {
        const j = data.job;
        setCurrentJobId(j.jobId);
        setBrandName(j.customerName || 'Lufthansa Group');
        setThemeContext(j.creativeTheme || '');
        if (j.styleModifiers !== undefined) setStyleModifiers(j.styleModifiers);
        if (j.selectedModel) setSelectedModel(j.selectedModel);
        if (j.selectedVideoQuality) setSelectedVideoQuality(j.selectedVideoQuality);
        if (j.currentStage) setCurrentStage(j.currentStage);
        if (j.slots && j.slots.length > 0) setSlots(j.slots);
        if (j.masterVideoUri) setMasterVideoUri(j.masterVideoUri);

        // Update URL query parameter
        const url = new URL(window.location.href);
        url.searchParams.set('job', j.jobId);
        window.history.replaceState({}, '', url.toString());
        return true;
      }
    } catch (e) {
      console.error(`Failed to load job ${jobIdToLoad}:`, e);
    } finally {
      setIsLoadingJobs(false);
    }
    return false;
  };

  const createAndSelectNewJob = async (
    customer: string = 'Lufthansa Group',
    theme: string = 'Aviation Countdown'
  ) => {
    setIsLoadingJobs(true);
    try {
      const initialSlots: CountdownSlot[] = Array.from({ length: 10 }, (_, i) => {
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
      });

      const res = await fetch(`${API_BASE}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customer,
          creativeTheme: theme,
          selectedModel,
          selectedVideoQuality,
          currentStage: 1,
          slots: initialSlots,
        }),
      });

      const data = await res.json();
      if (data.success && data.job) {
        setCurrentJobId(data.job.jobId);
        setBrandName(data.job.customerName);
        setThemeContext(data.job.creativeTheme);
        setCurrentStage(1);
        setSlots(initialSlots);
        setMasterVideoUri(null);

        // Update URL query parameter
        const url = new URL(window.location.href);
        url.searchParams.set('job', data.job.jobId);
        window.history.replaceState({}, '', url.toString());

        await fetchJobsList();
        return data.job;
      }
    } catch (e) {
      console.error('Failed to create new job:', e);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  // Initial Load: URL Deep Linking or Most Recent Job
  useEffect(() => {
    const initAppJob = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlJobId = urlParams.get('job');
      const jobs = await fetchJobsList();

      if (urlJobId) {
        const loaded = await loadJob(urlJobId);
        if (loaded) return;
      }

      if (jobs && jobs.length > 0) {
        await loadJob(jobs[0].jobId);
      } else {
        await createAndSelectNewJob('Lufthansa Group', 'Aviation Countdown');
      }
    };

    initAppJob();
  }, []);

  // Continuous Debounced Auto-Save to GCS
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!currentJobId) return;

    setSaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/jobs/${currentJobId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: brandName,
            creativeTheme: themeContext,
            styleModifiers,
            selectedModel,
            selectedVideoQuality,
            currentStage,
            slots,
            masterVideoUri,
          }),
        });

        if (res.ok) {
          setSaveStatus('saved');
          setJobsList((prev) =>
            prev.map((j) =>
              j.jobId === currentJobId
                ? {
                    ...j,
                    customerName: brandName,
                    creativeTheme: themeContext,
                    currentStage,
                    readyImagesCount: slots.filter((s) => Boolean(s.currentImageUri)).length,
                    readyVideosCount: slots.filter((s) => Boolean(s.rawVideoUri)).length,
                    hasMasterVideo: Boolean(masterVideoUri),
                    updatedAt: new Date().toISOString(),
                  }
                : j
            )
          );
        } else {
          setSaveStatus('error');
        }
      } catch (e) {
        setSaveStatus('error');
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [
    currentJobId,
    brandName,
    themeContext,
    styleModifiers,
    selectedModel,
    selectedVideoQuality,
    currentStage,
    slots,
    masterVideoUri,
  ]);

  const handleSelectJob = (jobId: string) => {
    loadJob(jobId);
  };

  const handleCreateNewJob = () => {
    createAndSelectNewJob(brandName || 'Lufthansa Group', 'Countdown');
  };

  const handleDeleteJob = async (jobIdToDelete: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${jobIdToDelete}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const remaining = await fetchJobsList();
        if (jobIdToDelete === currentJobId) {
          if (remaining && remaining.length > 0) {
            await loadJob(remaining[0].jobId);
          } else {
            await createAndSelectNewJob('Lufthansa Group', 'Aviation Countdown');
          }
        }
      }
    } catch (err) {
      console.error(`Failed to delete job ${jobIdToDelete}:`, err);
    }
  };

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

  // Active Parallel Video Workers State (tracks which 2 slots are actively being synthesized)
  const [activeVideoSlots, setActiveVideoSlots] = useState<{ workerId: number; slotIndex: number; concept: string }[]>([]);
  const [isBatchGeneratingVideos, setIsBatchGeneratingVideos] = useState(false);

  // 3. Generate Veo 3 Video for single slot (No Audio, 4.0s @ 60fps)
  const handleGenerateVideoForSlot = async (
    slotIndex: number,
    workerId: number = 1,
    qualityMode: VideoQualityMode = selectedVideoQuality
  ) => {
    const targetSlot = slots.find((s) => s.index === slotIndex);
    if (!targetSlot?.currentImageUri) return;

    setSlots((prev) =>
      prev.map((s) => (s.index === slotIndex ? { ...s, isVideoLoading: true, activeWorkerId: workerId, videoError: null } : s))
    );

    setActiveVideoSlots((prev) => [
      ...prev.filter((w) => w.workerId !== workerId),
      { workerId, slotIndex, concept: targetSlot.sceneConcept || `Shot #${slotIndex}` },
    ]);

    try {
      const res = await fetch(`${API_BASE}/api/generate-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotIndex,
          imageUri: targetSlot.currentImageUri,
          videoPrompt: targetSlot.videoPrompt,
          qualityMode,
          apiKey,
          authMode,
        }),
      });
      const data = await res.json();

      if (data.success && data.rawVideoUri) {
        setSlots((prev) =>
          prev.map((s) =>
            s.index === slotIndex
              ? { ...s, rawVideoUri: data.rawVideoUri, videoQuality: qualityMode, isVideoLoading: false, activeWorkerId: null }
              : s
          )
        );
      }
    } catch (err: any) {
      setSlots((prev) =>
        prev.map((s) =>
          s.index === slotIndex ? { ...s, isVideoLoading: false, activeWorkerId: null, videoError: err.message } : s
        )
      );
    } finally {
      setActiveVideoSlots((prev) => prev.filter((w) => w.workerId !== workerId));
    }
  };

  // Batch Generate all 10 Veo 3 videos (2 parallel workers)
  const handleGenerateAllVideos = async (qualityMode: VideoQualityMode = selectedVideoQuality) => {
    setCurrentStage(4);
    setIsBatchGeneratingVideos(true);
    setSelectedVideoQuality(qualityMode);
    const slotsWithImages = [...slots].filter((s) => Boolean(s.currentImageUri));
    const sorted = [...slotsWithImages].sort((a, b) => b.diegeticNumber - a.diegeticNumber);

    let cursor = 0;
    const worker = async (workerId: number) => {
      while (cursor < sorted.length) {
        const itemIndex = cursor++;
        const s = sorted[itemIndex];
        if (!s) break;
        await handleGenerateVideoForSlot(s.index, workerId, qualityMode);
      }
    };

    const workerCount = Math.min(2, sorted.length);
    await Promise.all(Array.from({ length: workerCount }, (_, i) => worker(i + 1)));
    setIsBatchGeneratingVideos(false);
    setActiveVideoSlots([]);
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
        currentJobId={currentJobId}
        jobs={jobsList}
        isLoadingJobs={isLoadingJobs}
        saveStatus={saveStatus}
        onSelectJob={handleSelectJob}
        onCreateNewJob={handleCreateNewJob}
        onDeleteJob={handleDeleteJob}
        onRefreshJobs={fetchJobsList}
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
                      onGenerateVideo={(slotIdx, quality) => handleGenerateVideoForSlot(slotIdx, 1, quality)}
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
          <section className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/40 shadow-xl space-y-6 animate-fadeIn">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
                  <Video className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Stage 4: Veo 3 Image-to-Video Synthesis (10 $\times$ 4.0s)</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      {videosCompletedCount}/10 Videos Ready
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Toggle between rapid 720p preview generation or high-fidelity 4K UHD broadcast master synthesis.
                  </p>
                </div>
              </div>

              {/* Video Generation Quality Mode Toggle & Action */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedVideoQuality('FAST_720P')}
                    disabled={isBatchGeneratingVideos}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      selectedVideoQuality === 'FAST_720P'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>⚡ Fast (720p Preview)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedVideoQuality('FULL_4K')}
                    disabled={isBatchGeneratingVideos}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      selectedVideoQuality === 'FULL_4K'
                        ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>🌟 Full (4K UHD Master)</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleGenerateAllVideos(selectedVideoQuality)}
                  disabled={isBatchGeneratingVideos}
                  className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-white text-xs font-bold shadow-xl transition-all hover:scale-105 disabled:opacity-50 ${
                    selectedVideoQuality === 'FULL_4K'
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
                      : 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/25'
                  }`}
                >
                  <Sparkles className={`w-4 h-4 ${isBatchGeneratingVideos ? 'animate-spin' : ''}`} />
                  <span>
                    {isBatchGeneratingVideos
                      ? `Synthesizing ${selectedVideoQuality === 'FULL_4K' ? '4K UHD' : '720p'} (2 Workers)...`
                      : allVideosReady
                      ? `Re-render All 10 (${selectedVideoQuality === 'FULL_4K' ? '4K Master' : '720p Fast'})`
                      : `Generate All 10 (${selectedVideoQuality === 'FULL_4K' ? '4K Master' : '720p Fast'}) (2 Workers)`}
                  </span>
                </button>
              </div>
            </div>

            {/* Parallel Worker Live Animation Dashboard */}
            {isBatchGeneratingVideos && (
              <div className="p-5 rounded-2xl bg-slate-950 border border-purple-500/40 shadow-2xl space-y-3">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-purple-300 border-b border-slate-800 pb-2.5">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping" />
                    <span>2 PARALLEL VEO 3 VIDEO SYNTHESIS CORES RUNNING</span>
                  </span>
                  <span className="text-slate-400">{videosCompletedCount} of 10 Complete</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Worker 1 */}
                  {(() => {
                    const w1 = activeVideoSlots.find((w) => w.workerId === 1);
                    return (
                      <div className={`p-4 rounded-xl border transition-all ${
                        w1
                          ? 'bg-purple-950/40 border-purple-500/60 shadow-lg shadow-purple-500/20 ring-1 ring-purple-500/30 animate-pulse'
                          : 'bg-slate-900/60 border-slate-800 text-slate-500'
                      }`}>
                        <div className="flex items-center justify-between text-[11px] font-mono font-bold mb-1">
                          <span className="text-purple-300 flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${w1 ? 'bg-purple-400 animate-ping' : 'bg-slate-600'}`} />
                            <span>Worker Alpha (Core 1)</span>
                          </span>
                          <span className="px-2 py-0.5 rounded bg-purple-900/60 text-purple-200 text-[10px]">
                            {w1 ? `Synthesizing Shot #${w1.slotIndex}` : 'Idle'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 font-medium truncate mt-1">
                          {w1 ? w1.concept : 'Waiting for next slot in queue...'}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Worker 2 */}
                  {(() => {
                    const w2 = activeVideoSlots.find((w) => w.workerId === 2);
                    return (
                      <div className={`p-4 rounded-xl border transition-all ${
                        w2
                          ? 'bg-blue-950/40 border-blue-500/60 shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/30 animate-pulse'
                          : 'bg-slate-900/60 border-slate-800 text-slate-500'
                      }`}>
                        <div className="flex items-center justify-between text-[11px] font-mono font-bold mb-1">
                          <span className="text-blue-300 flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${w2 ? 'bg-blue-400 animate-ping' : 'bg-slate-600'}`} />
                            <span>Worker Beta (Core 2)</span>
                          </span>
                          <span className="px-2 py-0.5 rounded bg-blue-900/60 text-blue-200 text-[10px]">
                            {w2 ? `Synthesizing Shot #${w2.slotIndex}` : 'Idle'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 font-medium truncate mt-1">
                          {w2 ? w2.concept : 'Waiting for next slot in queue...'}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
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
