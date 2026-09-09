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
  Play,
} from 'lucide-react';
import { Header } from './components/Header';
import { ThemeInputForm } from './components/ThemeInputForm';
import { SequentialStudio } from './components/SequentialStudio';
import { PromptReviewList } from './components/PromptReviewList';
import { PromptCarousel } from './components/PromptCarousel';
import { GoogleProgressBar } from './components/GoogleProgressBar';
import { SlotCard } from './components/SlotCard';
import { WaveformTimeline } from './components/WaveformTimeline';
import { RefineModal } from './components/RefineModal';
import { MasterExportModal } from './components/MasterExportModal';
import { VideoQualityModal } from './components/VideoQualityModal';
import { GoogleAuthGate } from './components/GoogleAuthGate';
import { PromptGuideModal } from './components/PromptGuideModal';
import { CountdownSlot, ImageModelType, VeoModelType, AuthMode, SlotTemporalConfig, VideoQualityMode, UpscaleEngineType, JobSummary, VeoQueueStatus, GroundingMetadata } from './types';
import { UNIVERSAL_STYLE_ANCHOR } from './utils/promptBuilder';
import { calculateTimelineOffsets, getDefaultTemporalConfigForSlot } from './utils/temporalMath';
import { playPromptChime, playStepSuccessChime, playGrandFinaleChime, setSoundEnabled as setAudioSoundEnabled } from './utils/audioChimes';
import { getMediaUrl } from './utils/media';

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

  // Audio Chimes Sound State: Default to Sound ON
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('sound_enabled');
    const enabled = saved !== null ? saved === 'true' : true;
    setAudioSoundEnabled(enabled);
    return enabled;
  });

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setAudioSoundEnabled(next);
    localStorage.setItem('sound_enabled', String(next));
  };

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
  const [selectedVeoModel, setSelectedVeoModel] = useState<VeoModelType>('veo-3.1-fast-generate-preview');
  const [selectedVideoQuality, setSelectedVideoQuality] = useState<VideoQualityMode>('FAST_720P');

  // Veo Prompt Guide (User-editable with per-user LocalStorage isolation)
  const [showPromptGuideModal, setShowPromptGuideModal] = useState<boolean>(false);
  const [customPromptGuide, setCustomPromptGuide] = useState<string>(() => {
    return localStorage.getItem('veo_custom_prompt_guide') || '';
  });
  const [defaultPromptGuide, setDefaultPromptGuide] = useState<string>('');

  useEffect(() => {
    // Fetch default prompt guide once for comparison and reset
    fetch(`${API_BASE}/api/veo-prompt-guide/default`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.content) {
          setDefaultPromptGuide(data.content);
        }
      })
      .catch((err) => console.warn('Failed to load default prompt guide:', err));
  }, []);

  const handleSaveCustomPromptGuide = (newContent: string) => {
    localStorage.setItem('veo_custom_prompt_guide', newContent);
    setCustomPromptGuide(newContent);
  };

  const handleResetCustomPromptGuide = () => {
    localStorage.removeItem('veo_custom_prompt_guide');
    setCustomPromptGuide('');
  };

  // Multi-step Workflow State (1 to 5)
  const [currentStage, setCurrentStage] = useState<number>(1);
  const [brandName, setBrandName] = useState<string>('');
  const [themeContext, setThemeContext] = useState<string>('');
  const [styleModifiers, setStyleModifiers] = useState<string>('');
  const [creatorLdap, setCreatorLdap] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('auth_user');
      if (saved) {
        const user = JSON.parse(saved);
        return user.email ? user.email.split('@')[0] : '';
      }
    } catch {}
    return '';
  });

  function createInitialSlots(): CountdownSlot[] {
    return Array.from({ length: 10 }, (_, i) => {
      const idx = 10 - i;
      return {
        index: idx,
        diegeticNumber: idx,
        sceneConcept: idx === 10 ? 'Shot #10' : `Pending (Shot #${idx})`,
        startImagePrompt: '',
        imagePrompt: '',
        endImagePrompt: '',
        videoPrompt: '',
        isPromptApproved: false,
        isPromptRecreating: false,
        currentImageUri: null,
        startImageUri: null,
        endImageUri: null,
        historyImageUri: null,
        isImageAccepted: false,
        isImageLoading: false,
        isEndImageLoading: false,
        imageError: null,
        endImageError: null,
        rawVideoUri: null,
        isVideoLoading: false,
        videoError: null,
        temporalConfig: getDefaultTemporalConfigForSlot(idx),
        processedVideoUri: null,
      };
    });
  }

  // Countdown Slots (10 down to 1)
  const [slots, setSlots] = useState<CountdownSlot[]>(createInitialSlots);

  // Global Loading States
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [isBatchGeneratingImages, setIsBatchGeneratingImages] = useState(false);
  const [generationStatusText, setGenerationStatusText] = useState('');
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Modal States
  const [activeRefineSlot, setActiveRefineSlot] = useState<CountdownSlot | null>(null);
  const [previewVideoUri, setPreviewVideoUri] = useState<string | null>(null);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExportingMaster, setIsExportingMaster] = useState(false);
  const [masterVideoUri, setMasterVideoUri] = useState<string | null>(null);
  const [extendedMasterVideoUri, setExtendedMasterVideoUri] = useState<string | null>(null);
  const [isExportingExtendedMaster, setIsExportingExtendedMaster] = useState(false);
  const [exportModalInitialTab, setExportModalInitialTab] = useState<'30s' | 'extended'>('30s');
  const [exportError, setExportError] = useState<string | null>(null);

  // Veo 3 Queue Status State (tracks server-side 2 parallel workers and waiting queue)
  const [veoQueueStatus, setVeoQueueStatus] = useState<VeoQueueStatus>({
    activeWorkers: [],
    activeCount: 0,
    maxWorkers: 2,
    queue: [],
    queueLength: 0,
  });

  // Google Search Grounding Metadata State
  const [groundingMetadata, setGroundingMetadata] = useState<GroundingMetadata | null>(null);
  const [geminiModelUsed, setGeminiModelUsed] = useState<string>('gemini-3.8-flash');

  const pollVeoQueueStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/veo-queue-status`);
      const data = await res.json();
      if (data.success) {
        setVeoQueueStatus({
          activeWorkers: data.activeWorkers || [],
          activeCount: data.activeCount || 0,
          maxWorkers: data.maxWorkers || 2,
          queue: data.queue || [],
          queueLength: data.queueLength || 0,
        });
      }
    } catch {
      // Ignore background poll errors
    }
  };

  useEffect(() => {
    const isAnyVideoLoading = slots.some((s) => s.isVideoLoading);
    const shouldPoll = isAnyVideoLoading || veoQueueStatus.activeCount > 0 || veoQueueStatus.queueLength > 0;

    pollVeoQueueStatus();
    if (!shouldPoll) return;

    const interval = setInterval(pollVeoQueueStatus, 1500);
    return () => clearInterval(interval);
  }, [slots, veoQueueStatus.activeCount, veoQueueStatus.queueLength]);

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
        setBrandName(j.customerName || '');
        setThemeContext(j.creativeTheme || '');
        if (j.creatorLdap) setCreatorLdap(j.creatorLdap);
        if (j.styleModifiers !== undefined) setStyleModifiers(j.styleModifiers);
        if (j.selectedModel) setSelectedModel(j.selectedModel);
        if (j.selectedVideoQuality) setSelectedVideoQuality(j.selectedVideoQuality);
        if (j.currentStage) setCurrentStage(j.currentStage);
        if (j.slots && j.slots.length > 0) setSlots(j.slots);
        setMasterVideoUri(j.masterVideoUri || null);
        setExtendedMasterVideoUri(j.extendedMasterVideoUri || null);
        if (j.groundingMetadata) setGroundingMetadata(j.groundingMetadata);
        if (j.geminiModelUsed) setGeminiModelUsed(j.geminiModelUsed);

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
    customer: string = '',
    theme: string = '',
    ldap: string = ''
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
          temporalConfig: getDefaultTemporalConfigForSlot(idx),
          processedVideoUri: null,
        };
      });

      const effectiveLdap = ldap || creatorLdap || '';
      const res = await fetch(`${API_BASE}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customer || 'New Project',
          creatorLdap: effectiveLdap,
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
        setBrandName(customer);
        setThemeContext(theme);
        if (effectiveLdap) setCreatorLdap(effectiveLdap);
        setCurrentStage(1);
        setSlots(initialSlots);
        setMasterVideoUri(null);
        setExtendedMasterVideoUri(null);
        setGlobalError(null);

        // Update URL query parameter
        const url = new URL(window.location.href);
        url.searchParams.set('job', data.job.jobId);
        window.history.replaceState({}, '', url.toString());

        await fetchJobsList();
        return data.job;
      }
    } catch (e) {
      console.error('Failed to create new job in GCS:', e);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  // Initial Load: URL Deep Linking or Clean Fresh Project
  useEffect(() => {
    const initAppJob = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlJobId = urlParams.get('job');
      await fetchJobsList();

      // Only load a past job if explicitly specified via ?job= query parameter
      if (urlJobId) {
        await loadJob(urlJobId);
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
            creatorLdap,
            creativeTheme: themeContext,
            styleModifiers,
            selectedModel,
            selectedVideoQuality,
            currentStage,
            slots,
            masterVideoUri,
            extendedMasterVideoUri,
            groundingMetadata,
            geminiModelUsed,
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
                    creatorLdap,
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
    creatorLdap,
    themeContext,
    styleModifiers,
    selectedModel,
    selectedVideoQuality,
    currentStage,
    slots,
    masterVideoUri,
    extendedMasterVideoUri,
  ]);

  const handleSelectJob = (jobId: string) => {
    loadJob(jobId);
  };

  const handleCreateNewJob = () => {
    createAndSelectNewJob('', '', creatorLdap);
  };

  const handleDeleteJob = async (jobIdToDelete: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${jobIdToDelete}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setJobsList((prev) => prev.filter((j) => j.jobId !== jobIdToDelete));
        if (jobIdToDelete === currentJobId) {
          setCurrentJobId(null);
          setBrandName('');
          setThemeContext('');
          setCurrentStage(1);
          setMasterVideoUri(null);
          setSlots(
            Array.from({ length: 10 }, (_, i) => ({
              index: 10 - i,
              diegeticNumber: 10 - i,
              sceneConcept: `Diegetic scene for #${10 - i}`,
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
              temporalConfig: getDefaultTemporalConfigForSlot(10 - i),
              processedVideoUri: null,
            }))
          );
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    } catch (err) {
      console.error(`Failed to delete job ${jobIdToDelete}:`, err);
    }
  };

  const handleBulkDeleteAllJobs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/jobs`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        await fetchJobsList();
        setCurrentJobId(null);
        setCurrentStage(1);
        setBrandName('');
        setThemeContext('');
        setSlots(createInitialSlots());
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch (err) {
      console.error('Failed to bulk delete all jobs:', err);
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

  // Only expose bulk create option after user has generated the 1st video (Shot #10)
  const isSlot10VideoReady = Boolean(
    slots.find((s) => s.diegeticNumber === 10 || s.index === 10)?.rawVideoUri ||
    slots.find((s) => s.diegeticNumber === 10 || s.index === 10)?.processedVideoUri
  );

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

  // 1. Initialize Countdown with Single-Shot #10 Prompt (Stage 1 -> Stage 2)
  const handleGeneratePrompts = async (brand: string, theme: string, styleAnchor: string, ldap: string) => {
    setBrandName(brand);
    setThemeContext(theme);
    setCreatorLdap(ldap);
    setIsGeneratingPrompts(true);
    setGlobalError(null);
    setGenerationStatusText('Synthesizing Shot #10 Prompt Concept with Gemini...');

    // Reset slots (10 initialized, 9..1 pending)
    const freshSlots: CountdownSlot[] = Array.from({ length: 10 }, (_, i) => {
      const idx = 10 - i;
      return {
        index: idx,
        diegeticNumber: idx,
        sceneConcept: idx === 10 ? `Initializing Shot #10...` : `Pending (Shot #${idx})`,
        startImagePrompt: '',
        imagePrompt: '',
        endImagePrompt: '',
        videoPrompt: '',
        isPromptApproved: false,
        isPromptRecreating: idx === 10,
        currentImageUri: null,
        startImageUri: null,
        endImageUri: null,
        historyImageUri: null,
        isImageAccepted: false,
        isImageLoading: false,
        isEndImageLoading: false,
        imageError: null,
        endImageError: null,
        rawVideoUri: null,
        isVideoLoading: false,
        videoError: null,
        temporalConfig: getDefaultTemporalConfigForSlot(idx),
        processedVideoUri: null,
      };
    });
    setSlots(freshSlots);

    // Ensure Job ID matches the customer brand name so URL query param is accurate
    const sanitizedBrand = (brand || '').trim().replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'Project';
    if (!currentJobId || !currentJobId.startsWith(sanitizedBrand)) {
      try {
        const createRes = await fetch(`${API_BASE}/api/jobs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: brand || 'Project',
            creatorLdap: ldap,
            creativeTheme: theme,
            selectedModel,
            selectedVideoQuality,
            currentStage: 1,
            slots: freshSlots,
          }),
        });
        const createData = await createRes.json();
        if (createData.success && createData.job) {
          setCurrentJobId(createData.job.jobId);
          const url = new URL(window.location.href);
          url.searchParams.set('job', createData.job.jobId);
          window.history.replaceState({}, '', url.toString());
          await fetchJobsList();
        }
      } catch (e) {
        console.warn('Failed to sync job ID for brand:', e);
      }
    }

    try {
      // Call unified 10-shot prompt generator (Option A) with Gemini 3.8 Flash & Google Search Grounding
      const res = await fetch(`${API_BASE}/api/generate-diegetic-prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: brand,
          themeContext: theme,
          apiKey,
          customPromptRules: customPromptGuide || undefined,
        }),
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.prompts) && data.prompts.length > 0) {
        if (data.groundingMetadata) {
          setGroundingMetadata(data.groundingMetadata);
        }
        if (data.model) {
          setGeminiModelUsed(data.model);
        }

        const promptsMap = new Map<number, any>();
        data.prompts.forEach((p: any) => {
          const num = Number(p.diegeticNumber) || Number(p.index);
          promptsMap.set(num, p);
        });

        setSlots((prev) =>
          prev.map((slot) => {
            const item = promptsMap.get(slot.diegeticNumber);
            if (!item) return slot;
            return {
              ...slot,
              sceneConcept: item.concept || `Shot #${slot.diegeticNumber} Scene`,
              objectEmbedding: item.objectEmbedding,
              revealMechanism: item.revealMechanism,
              startImagePrompt: item.startImagePrompt || item.imagePrompt,
              imagePrompt: item.startImagePrompt || item.imagePrompt,
              endImagePrompt: item.endImagePrompt,
              videoPrompt: item.videoPrompt,
              isPromptApproved: true,
              isPromptRecreating: false,
            };
          })
        );
        setCurrentStage(2); // Advance directly to Sequential Studio with all 10 prompts ready!
        setActiveSequentialSlot(10);
        playPromptChime();
      } else {
        setGlobalError(data.error || 'Failed to synthesize prompts for all 10 scenes');
      }
    } catch (err: any) {
      console.error('Failed to generate prompt for Shot #10:', err);
      setGlobalError(err.message);
    } finally {
      setIsGeneratingPrompts(false);
      setGenerationStatusText('');
    }
  };

  // Sequential Studio Active Slot (10 down to 1)
  const [activeSequentialSlot, setActiveSequentialSlot] = useState<number>(10);

  // 2. Prompt Review Handlers (Stage 2)
  const handleUpdatePrompt = (
    slotIndex: number,
    newPrompt: string,
    newConcept?: string,
    newVideoPrompt?: string,
    newEndPrompt?: string
  ) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.index === slotIndex
          ? {
              ...s,
              imagePrompt: newPrompt,
              startImagePrompt: newPrompt,
              endImagePrompt: newEndPrompt !== undefined ? newEndPrompt : s.endImagePrompt,
              videoPrompt: newVideoPrompt !== undefined ? newVideoPrompt : s.videoPrompt,
              sceneConcept: newConcept || s.sceneConcept,
              isPromptApproved: true,
            }
          : s
      )
    );
  };

  const handleUpdateEndPrompt = (slotIndex: number, newEndPrompt: string) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.index === slotIndex
          ? {
              ...s,
              endImagePrompt: newEndPrompt,
            }
          : s
      )
    );
  };

  const handleUpdateVideoPrompt = (slotIndex: number, newVideoPrompt: string) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.index === slotIndex
          ? {
              ...s,
              videoPrompt: newVideoPrompt,
            }
          : s
      )
    );
  };

  const handleRecreatePrompt = async (slotIndex: number, customVisualIdea?: string) => {
    setSlots((prev) =>
      prev.map((s) => (s.index === slotIndex ? { ...s, isPromptRecreating: true } : s))
    );

    const previousShots = slots
      .filter((s) => s.diegeticNumber > slotIndex && s.videoPrompt && !s.videoPrompt.startsWith('Pending'))
      .map((s) => ({
        index: s.index,
        diegeticNumber: s.diegeticNumber,
        concept: s.sceneConcept,
        objectEmbedding: s.objectEmbedding,
        revealMechanism: s.revealMechanism,
        videoPrompt: s.videoPrompt,
        startImagePrompt: s.startImagePrompt,
        endImagePrompt: s.endImagePrompt,
      }));

    try {
      const res = await fetch(`${API_BASE}/api/recreate-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diegeticNumber: slotIndex,
          brandName,
          themeContext,
          previousShots,
          customVisualIdea,
          apiKey,
          customPromptRules: customPromptGuide || undefined,
        }),
      });
      const data = await res.json();

      if (data.success && data.prompt) {
        const item = data.prompt;
        if (data.groundingMetadata) {
          setGroundingMetadata(data.groundingMetadata);
        }
        if (data.model) {
          setGeminiModelUsed(data.model);
        }
        setSlots((prev) =>
          prev.map((s) =>
            s.index === slotIndex
              ? {
                  ...s,
                  sceneConcept: item.concept,
                  objectEmbedding: item.objectEmbedding,
                  revealMechanism: item.revealMechanism,
                  startImagePrompt: item.startImagePrompt || item.imagePrompt,
                  imagePrompt: item.startImagePrompt || item.imagePrompt,
                  endImagePrompt: item.endImagePrompt,
                  videoPrompt: item.videoPrompt,
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

  const handleRefinePromptWithComment = async (slotIndex: number, comment: string) => {
    const targetSlot = slots.find((s) => s.index === slotIndex);
    if (!targetSlot) return;

    try {
      const res = await fetch(`${API_BASE}/api/refine-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotIndex,
          currentPrompt: targetSlot.videoPrompt,
          feedback: comment,
          brandName,
          themeContext,
          apiKey,
        }),
      });
      const data = await res.json();
      if (data.success && data.updatedPrompt) {
        if (data.model) {
          setGeminiModelUsed(data.model);
        }
        playPromptChime();
        setSlots((prev) =>
          prev.map((s) =>
            s.index === slotIndex
              ? {
                  ...s,
                  videoPrompt: data.updatedPrompt,
                  isPromptApproved: true,
                }
              : s
          )
        );
      }
    } catch (err) {
      console.error('Failed to refine prompt:', err);
    }
  };

  const handleRedoPromptFromScratch = async (slotIndex: number) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.index === slotIndex
          ? {
              ...s,
              rawVideoUri: null,
              processedVideoUri: null,
              videoError: null,
            }
          : s
      )
    );
    await handleRecreatePrompt(slotIndex);
  };

  const handleApproveAllPrompts = () => {
    setSlots((prev) => prev.map((s) => ({ ...s, isPromptApproved: true })));
  };

  // Proceed to Image Generation (Stage 2 -> Stage 3: Synthesize Start & End Keyframes)
  const handleProceedToImageGeneration = async () => {
    setCurrentStage(3);
    setIsBatchGeneratingImages(true);
    setGlobalError(null);

    const sortedSlots = [...slots].sort((a, b) => b.diegeticNumber - a.diegeticNumber);
    setGenerationStatusText('Synthesizing Frame 1 (Start) & Frame N (End with Numeral) keyframe pairs with 2 parallel workers...');

    await runWorkerPool(sortedSlots, 2, async (slot, idx) => {
      setGenerationStatusText(`Synthesizing Keyframe Pair for Shot #${slot.diegeticNumber} (${idx + 1}/10)...`);
      const startPrompt = slot.startImagePrompt || slot.imagePrompt;
      const endPrompt = slot.endImagePrompt || `A tight cinematic hero shot focused on ${slot.objectEmbedding || 'carrier surface'}. The physical countdown numeral '${slot.diegeticNumber}' is authentically crafted in sharp center focus.`;

      const startOk = await generateImageForSlot(slot.diegeticNumber, startPrompt, brandName, 'start');
      const endOk = await generateImageForSlot(slot.diegeticNumber, endPrompt, brandName, 'end');
      return startOk && endOk;
    });

    setIsBatchGeneratingImages(false);
    setGenerationStatusText('');
  };

  // Single Slot Image Generation (Supports 'start' Frame 1 and 'end' Frame N)
  const generateImageForSlot = async (
    slotIndex: number,
    promptText?: string,
    brand?: string,
    frameType: 'start' | 'end' = 'start'
  ): Promise<boolean> => {
    const isEnd = frameType === 'end';
    setSlots((prev) =>
      prev.map((s) =>
        s.index === slotIndex
          ? isEnd
            ? { ...s, isEndImageLoading: true, endImageError: null }
            : { ...s, isImageLoading: true, imageError: null }
          : s
      )
    );

    const targetSlot = slots.find((s) => s.index === slotIndex);
    const effectivePrompt =
      promptText ||
      (isEnd
        ? targetSlot?.endImagePrompt || `Hero close-up shot revealing physical countdown numeral '${slotIndex}'`
        : targetSlot?.startImagePrompt || targetSlot?.imagePrompt || '');

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
          jobId: currentJobId,
        }),
      });
      const data = await res.json();

      if (data.success && data.imageUri) {
        playStepSuccessChime();
        setSlots((prev) =>
          prev.map((s) => {
            if (s.index === slotIndex) {
              if (isEnd) {
                return {
                  ...s,
                  endImageUri: data.imageUri,
                  isEndImageLoading: false,
                  endImageError: null,
                };
              }
              return {
                ...s,
                historyImageUri: s.currentImageUri,
                currentImageUri: data.imageUri,
                startImageUri: data.imageUri,
                isImageLoading: false,
                imageError: null,
              };
            }
            return s;
          })
        );
        return true;
      } else {
        const errMsg = data.error || `Failed to generate ${frameType} image for Shot #${slotIndex}`;
        setSlots((prev) =>
          prev.map((s) =>
            s.index === slotIndex
              ? isEnd
                ? { ...s, isEndImageLoading: false, endImageError: errMsg }
                : { ...s, isImageLoading: false, imageError: errMsg }
              : s
          )
        );
        setGlobalError(errMsg);
        return false;
      }
    } catch (err: any) {
      setSlots((prev) =>
        prev.map((s) =>
          s.index === slotIndex
            ? isEnd
              ? { ...s, isEndImageLoading: false, endImageError: err.message }
              : { ...s, isImageLoading: false, imageError: err.message }
            : s
        )
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

  // Redo Start Shot
  const handleRedoShot = (slotIndex: number) => {
    const targetSlot = slots.find((s) => s.index === slotIndex);
    generateImageForSlot(slotIndex, targetSlot?.startImagePrompt || targetSlot?.imagePrompt, brandName, 'start');
  };

  // Redo End Shot (with numeral)
  const handleRedoEndImage = (slotIndex: number) => {
    const targetSlot = slots.find((s) => s.index === slotIndex);
    generateImageForSlot(slotIndex, targetSlot?.endImagePrompt, brandName, 'end');
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
    const targetSlot = slots.find((s) => s.index === slotIndex);
    const formData = new FormData();
    formData.append('slotIndex', slotIndex.toString());
    formData.append('customPrompt', customPrompt);
    formData.append('currentImageUri', targetSlot?.currentImageUri || '');
    formData.append('brandName', brandName);
    formData.append('apiKey', apiKey || '');
    formData.append('jobId', currentJobId || '');
    if (brandRefFile) {
      formData.append('brandReference', brandRefFile);
    }

    setSlots((prev) =>
      prev.map((s) => (s.index === slotIndex ? { ...s, isImageLoading: true, imageError: null } : s))
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
                imageError: null,
              };
            }
            return s;
          })
        );
      } else {
        const errMsg = data.error || 'Failed to refine shot';
        setSlots((prev) =>
          prev.map((s) => (s.index === slotIndex ? { ...s, isImageLoading: false, imageError: errMsg } : s))
        );
      }
    } catch (err: any) {
      console.error('Failed to refine slot:', err);
      setSlots((prev) =>
        prev.map((s) => (s.index === slotIndex ? { ...s, isImageLoading: false, imageError: err.message } : s))
      );
    }
  };

  const handleSelectSequentialSlot = async (slotIndex: number) => {
    setActiveSequentialSlot(slotIndex);
    const targetSlot = slots.find((s) => s.diegeticNumber === slotIndex);
    if (!targetSlot?.videoPrompt || targetSlot?.sceneConcept?.includes('Pending') || targetSlot.videoPrompt.length < 10) {
      await handleRecreatePrompt(slotIndex);
    }
  };

  const handleProceedToNextShot = async () => {
    if (activeSequentialSlot > 1) {
      const nextNum = activeSequentialSlot - 1;
      setActiveSequentialSlot(nextNum);
      const nextSlot = slots.find((s) => s.diegeticNumber === nextNum);
      if (!nextSlot?.videoPrompt || nextSlot?.sceneConcept?.includes('Pending') || nextSlot.videoPrompt.length < 10) {
        await handleRecreatePrompt(nextNum);
      }
    }
  };

  const handlePreviewStitchedCountdown = async () => {
    setIsExportingMaster(true);
    setExportError(null);

    try {
      const res = await fetch(`${API_BASE}/api/export-master`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotsConfig: slots
            .filter((s) => Boolean(s.rawVideoUri || s.processedVideoUri))
            .map((s) => ({
              index: s.index,
              processedVideoUri: s.processedVideoUri,
              rawVideoUri: s.rawVideoUri,
              temporalConfig: s.temporalConfig,
            })),
          qualityMode: selectedVideoQuality,
          jobId: currentJobId,
        }),
      });
      const data = await res.json();

      if (data.success && data.masterVideoUri) {
        setMasterVideoUri(data.masterVideoUri);
        setPreviewVideoUri(data.masterVideoUri);
      } else {
        setExportError(data.error || 'Failed to preview stitched countdown.');
      }
    } catch (err: any) {
      setExportError(err.message);
    } finally {
      setIsExportingMaster(false);
    }
  };

  // Active Parallel Video Workers State (tracks which 2 slots are actively being synthesized)
  const [activeVideoSlots, setActiveVideoSlots] = useState<{ workerId: number; slotIndex: number; concept: string }[]>([]);
  const [isBatchGeneratingVideos, setIsBatchGeneratingVideos] = useState(false);

  // 3. Direct Veo 3.1 Text-to-Video Generation for single slot (4.0s @ 60fps)
  const handleGenerateVideoForSlot = async (
    slotIndex: number,
    workerId: number = 1,
    qualityMode: VideoQualityMode = selectedVideoQuality
  ) => {
    const targetSlot = slots.find((s) => s.index === slotIndex);
    if (!targetSlot) return;

    const effectivePrompt =
      targetSlot.videoPrompt ||
      `[0.0s-2.5s]: Dynamic wide cinematic camera tracking shot establishing ${targetSlot.sceneConcept || themeContext || 'engineering facility'} for ${brandName || 'brand'}, focusing solely on moving machinery and ambient cinematic lighting. [2.5s-4.0s]: Camera rapidly zooms and macro-locks onto the center of ${targetSlot.objectEmbedding || 'carrier surface'}, revealing the bold high-contrast physical numeral '${slotIndex}' laser-etched in glowing amber luminescence against a dark matte finish occupying the center of the frame in razor-sharp focus during the final second. Essential requirement: the physical numeral '${slotIndex}' must be clearly visible, centered, and unmistakably rendered in frame. Cinematography: 35mm anamorphic lens, macro depth of field, volumetric rim lighting, 8k photorealistic textures, 60fps.`;

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
          videoPrompt: effectivePrompt,
          qualityMode,
          veoModel: selectedVeoModel,
          apiKey,
          authMode,
          jobId: currentJobId,
        }),
      });
      const data = await res.json();

      if (data.success && data.rawVideoUri) {
        playStepSuccessChime();
        setSlots((prev) =>
          prev.map((s) =>
            s.index === slotIndex
              ? { ...s, rawVideoUri: data.rawVideoUri, videoQuality: qualityMode, isVideoLoading: false, activeWorkerId: null, videoError: null }
              : s
          )
        );
        // Trigger Veo AI Video Quality Inspector in background automatically
        handleAnalyzeVideoForSlot(slotIndex, data.rawVideoUri);
      } else {
        const errorMsg = data.error || (data.details ? JSON.stringify(data.details) : 'Video generation failed');
        setSlots((prev) =>
          prev.map((s) =>
            s.index === slotIndex
              ? { ...s, isVideoLoading: false, activeWorkerId: null, videoError: errorMsg }
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
      setSlots((prev) =>
        prev.map((s) => (s.index === slotIndex ? { ...s, isVideoLoading: false, activeWorkerId: null } : s))
      );
    }
  };

  // 3b. Veo AI Video Quality Inspector with Gemini 3.8 Flash Multimodal Frame Analysis
  const handleAnalyzeVideoForSlot = async (slotIndex: number, specificVideoUri?: string) => {
    const targetSlot = slots.find((s) => s.index === slotIndex);
    if (!targetSlot) return;
    const videoUri = specificVideoUri || targetSlot.processedVideoUri || targetSlot.rawVideoUri;
    if (!videoUri) return;

    setSlots((prev) =>
      prev.map((s) => (s.index === slotIndex ? { ...s, isAnalyzingVideo: true } : s))
    );

    try {
      const res = await fetch(`${API_BASE}/api/analyze-video-slot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotIndex,
          diegeticNumber: targetSlot.diegeticNumber,
          brandName: brandName || 'Brand',
          videoPrompt: targetSlot.videoPrompt || '',
          videoUri,
          apiKey,
          authMode,
          jobId: currentJobId,
        }),
      });
      const data = await res.json();
      if (data.success && data.analysis) {
        setSlots((prev) =>
          prev.map((s) =>
            s.index === slotIndex
              ? { ...s, isAnalyzingVideo: false, videoAnalysis: data.analysis }
              : s
          )
        );
      } else {
        setSlots((prev) =>
          prev.map((s) => (s.index === slotIndex ? { ...s, isAnalyzingVideo: false } : s))
        );
      }
    } catch {
      setSlots((prev) =>
        prev.map((s) => (s.index === slotIndex ? { ...s, isAnalyzingVideo: false } : s))
      );
    }
  };

  // 3c. 1-Click Apply AI Prompt Fix and Regenerate Video (Self-Improvement with Human in the Loop)
  const handleApplyAiPromptFixAndRegenerate = async (slotIndex: number, fixPrompt: string) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.index === slotIndex
          ? { ...s, videoPrompt: fixPrompt, videoAnalysis: undefined }
          : s
      )
    );
    await handleGenerateVideoForSlot(slotIndex, 1, selectedVideoQuality);
  };

  // Batch Generate remaining missing Veo 3 videos (Parallel 2-Worker Queue Dispatch)
  const handleGenerateAllVideos = async (qualityMode: VideoQualityMode = selectedVideoQuality) => {
    setCurrentStage(4);
    setIsBatchGeneratingVideos(true);
    setSelectedVideoQuality(qualityMode);

    // Only target slots that do NOT already have a generated video and are not currently loading
    const missingSlots = [...slots].filter(
      (s) => !s.rawVideoUri && !s.processedVideoUri && !s.isVideoLoading
    );
    const sorted = [...missingSlots].sort((a, b) => b.diegeticNumber - a.diegeticNumber);

    // Dispatch all missing slots concurrently to backend VeoQueueManager.
    // Backend assigns Worker 1 & Worker 2 in parallel, pulling subsequent slots automatically.
    // Promise.allSettled guarantees that an individual slot error/timeout does not block the other worker.
    await Promise.allSettled(
      sorted.map((s) => handleGenerateVideoForSlot(s.index, 1, qualityMode))
    );

    setIsBatchGeneratingVideos(false);
    setActiveVideoSlots([]);
    playGrandFinaleChime();
  };

  // 4. Update Temporal Config for Slot
  const handleUpdateTemporalConfig = (slotIndex: number, config: SlotTemporalConfig) => {
    setSlots((prev) =>
      prev.map((s) => (s.index === slotIndex ? { ...s, temporalConfig: config } : s))
    );
  };

  // 5. Trigger Master ffmpeg Export (Supports Dual 4K Upscale Engines)
  const handleExportMaster = async (engine: UpscaleEngineType = 'LANCZOS_4K') => {
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
          qualityMode: engine === 'FAST_720P' ? 'FAST_720P' : 'FULL_4K',
          upscaleEngine: engine,
          jobId: currentJobId,
        }),
      });
      const data = await res.json();

      if (data.success && data.masterVideoUri) {
        setMasterVideoUri(data.masterVideoUri);
        // Reset extended master on fresh master generation so it can be re-rendered cleanly
        setExtendedMasterVideoUri(null);
        playGrandFinaleChime();
      } else {
        setExportError(data.error || 'Failed to export master video.');
      }
    } catch (err: any) {
      setExportError(err.message);
    } finally {
      setIsExportingMaster(false);
    }
  };

  // 6. Trigger Extended Master Export (+ Google I/O Outro with 2-second Fade Transition)
  const handleExportExtendedMaster = async () => {
    if (!currentJobId) return;
    setIsExportingExtendedMaster(true);
    setExportError(null);

    let effectiveMasterUri = masterVideoUri;

    try {
      // If 30s master has not been generated yet, assemble it first
      if (!effectiveMasterUri) {
        setIsExportingMaster(true);
        const resMaster = await fetch(`${API_BASE}/api/export-master`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slotsConfig: slots.map((s) => ({
              index: s.index,
              processedVideoUri: s.processedVideoUri,
              rawVideoUri: s.rawVideoUri,
              temporalConfig: s.temporalConfig,
            })),
            qualityMode: 'FULL_4K',
            upscaleEngine: 'LANCZOS_4K',
            jobId: currentJobId,
          }),
        });
        const masterData = await resMaster.json();
        setIsExportingMaster(false);
        if (masterData.success && masterData.masterVideoUri) {
          effectiveMasterUri = masterData.masterVideoUri;
          setMasterVideoUri(masterData.masterVideoUri);
        } else {
          setExportError(masterData.error || 'Failed to assemble base 30s countdown master.');
          return;
        }
      }

      const res = await fetch(`${API_BASE}/api/export-extended-master`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: currentJobId,
          masterVideoUri: effectiveMasterUri,
        }),
      });
      const data = await res.json();

      if (data.success && data.extendedMasterVideoUri) {
        setExtendedMasterVideoUri(data.extendedMasterVideoUri);
        playGrandFinaleChime();
      } else {
        setExportError(data.error || 'Failed to export extended master video.');
      }
    } catch (err: any) {
      setExportError(err.message);
    } finally {
      setIsExportingExtendedMaster(false);
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
        selectedVeoModel={selectedVeoModel}
        onVeoModelChange={setSelectedVeoModel}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        authUser={authUser}
        onSignOut={handleSignOut}
        currentJobId={currentJobId}
        jobs={jobsList}
        isLoadingJobs={isLoadingJobs}
        saveStatus={saveStatus}
        onSelectJob={handleSelectJob}
        onCreateNewJob={handleCreateNewJob}
        onDeleteJob={handleDeleteJob}
        onBulkDeleteAllJobs={handleBulkDeleteAllJobs}
        onRefreshJobs={fetchJobsList}
        onOpenPromptGuide={() => setShowPromptGuideModal(true)}
        hasCustomPromptGuide={Boolean(customPromptGuide && customPromptGuide.trim().length > 0)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Stepper Progress Indicator */}
        <div className="flex items-center justify-between max-w-4xl mx-auto px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          {[
            { num: 1, label: '1. Brand & Style' },
            { num: 2, label: '2. Sequential Studio (10 → 1)' },
            { num: 3, label: '3. Master Export & Preview' },
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
              {idx < 2 && (
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
          initialBrandName={brandName}
          initialThemeContext={themeContext}
          initialCreatorLdap={creatorLdap}
        />

        {/* Global Error Banner */}
        {globalError && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between shadow-sm animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="font-bold uppercase tracking-wider">Generation Notice:</span>
              <span>{globalError}</span>
            </div>
            <button
              type="button"
              onClick={() => handleGenerateVideoForSlot(activeSequentialSlot)}
              className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* STAGE 2+: Interactive Sequential 10-to-1 Studio */}
        {currentStage >= 2 && (
          <SequentialStudio
            slots={slots}
            activeSlotIndex={activeSequentialSlot}
            brandName={brandName}
            themeContext={themeContext}
            selectedVideoQuality={selectedVideoQuality}
            selectedVeoModel={selectedVeoModel}
            onChangeVeoModel={setSelectedVeoModel}
            onSelectSlot={handleSelectSequentialSlot}
            onUpdateVideoPrompt={handleUpdateVideoPrompt}
            onRecreatePrompt={handleRecreatePrompt}
            onGenerateVideo={(idx, quality) => handleGenerateVideoForSlot(idx, 1, quality)}
            onGenerateAllVideos={handleGenerateAllVideos}
            isBatchGeneratingVideos={isBatchGeneratingVideos}
            onPlayVideo={setPreviewVideoUri}
            onPreviewStitchedCountdown={handlePreviewStitchedCountdown}
            isStitchingMaster={isExportingMaster}
            onProceedToNextShot={handleProceedToNextShot}
            veoQueueStatus={veoQueueStatus}
            onRefinePromptWithComment={handleRefinePromptWithComment}
            onRedoPromptFromScratch={handleRedoPromptFromScratch}
            groundingMetadata={groundingMetadata}
            geminiModelUsed={geminiModelUsed}
            onAnalyzeVideo={handleAnalyzeVideoForSlot}
            onApplyPromptFixAndRegenerate={handleApplyAiPromptFixAndRegenerate}
            showBulkVideoOption={isSlot10VideoReady}
          />
        )}

        {/* Audio Waveform Timeline */}
        {currentStage >= 2 && videosCompletedCount > 0 && (
          <div className="space-y-4 pt-4 animate-fadeIn">
            <WaveformTimeline
              slots={slots}
              onUpdateSlotTemporalConfig={handleUpdateTemporalConfig}
              audioTrackUri="/countdown/countdown_track.mp3"
            />
          </div>
        )}

        {/* Export Master Final Assembly Banner */}
        {currentStage >= 2 && videosCompletedCount > 0 && (
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950 text-white border border-slate-800 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 animate-fadeIn">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-extrabold flex items-center gap-2">
                  <Film className="w-5 h-5 text-[#4285F4]" />
                  <span>Assemble & Export Countdown Master</span>
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-950/80 text-blue-300 border border-blue-800">
                  {videosCompletedCount}/10 Clips Ready
                </span>
                {masterVideoUri && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    30s Master Ready
                  </span>
                )}
                {extendedMasterVideoUri && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Extended Ready (~2m)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 max-w-xl">
                Choose between the standalone 30-second countdown master or the extended broadcast version with the Google I/O outro and 2-second crossfade.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Option 1: 30s Countdown Master (Blue) */}
              {masterVideoUri ? (
                <div className="flex items-center gap-1 p-1 rounded-2xl bg-blue-950/60 border border-blue-500/40 shadow-lg shadow-blue-500/10">
                  <button
                    type="button"
                    onClick={() => {
                      setExportModalInitialTab('30s');
                      setShowExportModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4285F4] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Play 30s Master</span>
                  </button>
                  <a
                    href={getMediaUrl(masterVideoUri)}
                    download="countdown_30s_master_4k.mp4"
                    className="p-2.5 rounded-xl text-blue-300 hover:text-white hover:bg-blue-900/50 transition-colors"
                    title="Download 30s Master MP4"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setExportModalInitialTab('30s');
                    setShowExportModal(true);
                    handleExportMaster();
                  }}
                  className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-[#4285F4] hover:bg-blue-600 text-white font-bold text-xs sm:text-sm shadow-xl shadow-blue-500/25 transition-all hover:scale-105 active:scale-95"
                >
                  <Film className="w-4 h-4" />
                  <span>30s Countdown Master</span>
                </button>
              )}

              {/* Option 2: Extended Master with Google I/O Outro (Purple) */}
              {extendedMasterVideoUri ? (
                <div className="flex items-center gap-1 p-1 rounded-2xl bg-purple-950/60 border border-purple-500/40 shadow-lg shadow-purple-500/10">
                  <button
                    type="button"
                    onClick={() => {
                      setExportModalInitialTab('extended');
                      setShowExportModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Play Extended (~2m01s)</span>
                  </button>
                  <a
                    href={getMediaUrl(extendedMasterVideoUri)}
                    download="countdown_extended_master_google_io_4k.mp4"
                    className="p-2.5 rounded-xl text-purple-300 hover:text-white hover:bg-purple-900/50 transition-colors"
                    title="Download Extended Master MP4"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setExportModalInitialTab('extended');
                    setShowExportModal(true);
                    handleExportExtendedMaster();
                  }}
                  className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-purple-500/25 transition-all hover:scale-105 active:scale-95"
                >
                  <Layers className="w-4 h-4" />
                  <span>Extended (+ Google I/O Outro)</span>
                </button>
              )}

              {/* Regenerate Action (visible when either master is ready) */}
              {(masterVideoUri || extendedMasterVideoUri) && (
                <button
                  type="button"
                  onClick={() => {
                    setShowExportModal(true);
                  }}
                  className="p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                  title="Regenerate Master Video (choose upscaling engine)"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
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

      {/* Video Quality Selection Modal */}
      <VideoQualityModal
        isOpen={showQualityModal}
        onClose={() => setShowQualityModal(false)}
        selectedQuality={selectedVideoQuality}
        onConfirm={(quality) => {
          setSelectedVideoQuality(quality);
          setShowQualityModal(false);
          setCurrentStage(4);
          handleGenerateAllVideos(quality);
        }}
      />

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
              <video
                src={getMediaUrl(previewVideoUri)}
                autoPlay
                muted
                loop
                playsInline
                controls
                className="w-full h-full object-contain"
              />
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
          extendedMasterVideoUri={extendedMasterVideoUri}
          isExporting={isExportingMaster}
          isExportingExtended={isExportingExtendedMaster}
          totalDuration={30.0}
          error={exportError}
          onExport={handleExportMaster}
          onExportExtended={handleExportExtendedMaster}
          initialTab={exportModalInitialTab}
        />
      )}

      {/* Veo Prompt Engineering Guide Modal */}
      <PromptGuideModal
        isOpen={showPromptGuideModal}
        onClose={() => setShowPromptGuideModal(false)}
        customGuide={customPromptGuide}
        defaultGuide={defaultPromptGuide}
        onSaveGuide={handleSaveCustomPromptGuide}
        onResetGuide={handleResetCustomPromptGuide}
      />

      {/* Lower Right GitHub Project Link */}
      <div className="fixed bottom-4 right-4 z-30">
        <a
          href="https://github.com/aosterloh/magic-countdown-generator"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-900 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 text-[11px] font-semibold backdrop-blur-md shadow-lg transition-all hover:scale-105 active:scale-95 group"
          title="View GitHub Repository"
        >
          <svg className="w-3.5 h-3.5 fill-current text-slate-400 group-hover:text-white transition-colors" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          <span>GitHub</span>
        </a>
      </div>
    </div>
  );
};

export default App;
