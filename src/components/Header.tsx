import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Key, Activity, Sun, Moon, Sparkles, ChevronDown, ExternalLink, CheckCircle2, X, Terminal, RefreshCw, Image as ImageIcon, ShieldCheck } from 'lucide-react';
import { ImageModelType, AuthMode, JobSummary } from '../types';
import { getMediaUrl } from '../utils/media';
import { JobSelectorDropdown } from './JobSelectorDropdown';

interface HeaderProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  authMode: AuthMode;
  onAuthModeChange: (mode: AuthMode) => void;
  selectedModel: ImageModelType;
  onModelChange: (model: ImageModelType) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  authUser?: { email: string; name: string } | null;
  onSignOut?: () => void;
  currentJobId: string | null;
  jobs: JobSummary[];
  isLoadingJobs: boolean;
  saveStatus: 'saved' | 'saving' | 'error';
  onSelectJob: (jobId: string) => void;
  onCreateNewJob: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  apiKey,
  onApiKeyChange,
  authMode,
  onAuthModeChange,
  selectedModel,
  onModelChange,
  isDarkMode,
  onToggleTheme,
  authUser,
  onSignOut,
  currentJobId,
  jobs,
  isLoadingJobs,
  saveStatus,
  onSelectJob,
  onCreateNewJob,
}) => {
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);
  const [tempModel, setTempModel] = useState<ImageModelType>(selectedModel);

  // Test Gemini API State
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Logs State
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const staticTestPrompt = `A cinematic close-up of Aerospace turbine throttle quadrant for Porsche Motorsport for Porsche Motorsport in a setting of Hyper-modern automotive telemetry laboratory, titanium engine components, illuminated carbon fiber cockpit gauge. The number "10" is physically engraved, illuminated, embossed, or stamped directly onto the etched titanium power gauge marking '10' as an authentic, diegetic part of the physical object with realistic wear and reflections. No artificial or floating graphic overlays. Cinematic 8K, photorealistic, shot on 35mm anamorphic lens, shallow depth of field, natural atmospheric lighting, dynamic push-in zoom, highly detailed texture, hyper-realistic color grading, 16:9 aspect ratio.`;

  useEffect(() => {
    setTempKey(apiKey);
  }, [apiKey]);

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const base = window.location.port === '5173' ? 'http://localhost:3001' : '';
      const res = await fetch(`${base}/api/logs`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.warn('Could not fetch logs:', e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleRunApiTest = async () => {
    setIsTestingApi(true);
    setTestError(null);
    setTestResult(null);
    try {
      const base = window.location.port === '5173' ? 'http://localhost:3001' : '';
      const res = await fetch(`${base}/api/test-gemini-api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: staticTestPrompt,
          apiKey,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult(data);
      } else {
        setTestError(data.error || 'Test failed');
      }
    } catch (err: any) {
      setTestError(err.message);
    } finally {
      setIsTestingApi(false);
    }
  };

  const modelLabels: Record<ImageModelType, { name: string; desc: string; badge: string }> = {
    'gemini-3.1-flash-image': {
      name: 'Gemini Nano Banana (gemini-2.5-flash-image)',
      desc: 'Flagship multimodal image model with direct diegetic number grounding',
      badge: 'Active Model',
    },
    'imagen-3.0-generate-002': {
      name: 'Google Imagen 3 (Photorealism)',
      desc: '35mm anamorphic cinematic lighting & texture fidelity',
      badge: 'High Quality',
    },
    'imagen-3.0-fast-generate-001': {
      name: 'Google Imagen 3 Fast',
      desc: 'Ultra rapid low-latency thumbnail generation',
      badge: 'Fast',
    },
    'procedural-diegetic': {
      name: 'Procedural Diegetic Canvas Engine',
      desc: 'High-definition offline renderer with zero API key requirement',
      badge: 'Offline/Local',
    },
  };

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-sm transition-colors duration-200">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-[#4285F4]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#EA4335]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#FBBC04]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#34A853]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Magic Countdown Generator
            </h1>
            <a
              href="/specifications/spec_v8.html"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-50 dark:bg-blue-950 text-[#4285F4] hover:text-blue-700 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 flex items-center gap-1 transition-all shadow-sm"
              title="Open EGM Specification HTML"
            >
              <span>EGM v8.0 Spec</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            30-Second Cinematic Countdown Generator (Gemini Nano Banana & Veo 3)
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Multi-User GCS Job Switcher Dropdown */}
        <JobSelectorDropdown
          currentJobId={currentJobId}
          jobs={jobs}
          isLoading={isLoadingJobs}
          saveStatus={saveStatus}
          onSelectJob={onSelectJob}
          onCreateNewJob={onCreateNewJob}
        />

        {/* Light / Dark Mode Toggle Button */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>
      </div>

      {/* PORTAL MODAL 1: Log Analysis Modal */}
      {showLogsModal &&
        createPortal(
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[99999] overflow-y-auto flex items-center justify-center p-4 sm:p-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-scaleUp my-auto max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-[#4285F4]">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Live Server & AI Log Analysis
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Real-time backend trace, model response payloads, and execution metrics.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchLogs}
                    disabled={isLoadingLogs}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                  <button
                    onClick={() => setShowLogsModal(false)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Log Stream */}
              <div className="flex-1 overflow-y-auto space-y-2 p-4 bg-slate-950 rounded-2xl font-mono text-xs text-slate-300 border border-slate-800 max-h-96">
                {logs.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">No logs recorded yet.</div>
                ) : (
                  logs.map((l) => (
                    <div key={l.id} className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span className="font-semibold">{new Date(l.timestamp).toLocaleTimeString()}</span>
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            l.level === 'SUCCESS'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : l.level === 'WARN'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : l.level === 'ERROR'
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : 'bg-blue-950 text-blue-400 border border-blue-800'
                          }`}
                        >
                          {l.category} • {l.level}
                        </span>
                      </div>
                      <div className="text-slate-200">{l.message}</div>
                      {l.details && (
                        <pre className="text-[10px] text-slate-400 overflow-x-auto p-1.5 bg-black/50 rounded">
                          {typeof l.details === 'string' ? l.details : JSON.stringify(l.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setShowLogsModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  Close Logs
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* PORTAL MODAL 2: Test Gemini API Modal */}
      {showTestModal &&
        createPortal(
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[99999] overflow-y-auto flex items-center justify-center p-4 sm:p-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-scaleUp my-auto">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Test Gemini API (Single Image Test)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Live test with Gemini Nano Banana (gemini-2.5-flash-image).
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowTestModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Static Prompt Box */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Static Test Prompt:
                </label>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-mono leading-relaxed max-h-24 overflow-y-auto">
                  {staticTestPrompt}
                </div>
              </div>

              {/* Generated Image Preview & Diagnostic Log */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#4285F4]" />
                    <span>Real AI Generated Image (Nano Banana)</span>
                  </label>
                  <button
                    type="button"
                    disabled={isTestingApi}
                    onClick={handleRunApiTest}
                    className="px-3.5 py-1.5 rounded-xl bg-[#4285F4] hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingApi ? 'animate-spin' : ''}`} />
                    <span>{isTestingApi ? 'Synthesizing...' : 'Re-run Test'}</span>
                  </button>
                </div>

                {isTestingApi && (
                  <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center space-y-3 text-center">
                    <RefreshCw className="w-8 h-8 text-[#4285F4] animate-spin" />
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Generating photorealistic AI image via Gemini Nano Banana...
                    </p>
                  </div>
                )}

                {testResult?.imageUri && (
                  <div className="space-y-3">
                    <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-md aspect-video bg-black">
                      <img
                        src={getMediaUrl(testResult.imageUri)}
                        alt="Gemini API Test"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Diagnostic Attempts Summary */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        API Diagnostic Log:
                      </div>
                      <div className="space-y-1.5 font-mono text-[11px]">
                        {testResult.attempts?.map((att: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                att.success
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {att.status || '200'}
                            </span>
                            <span className="text-slate-700 dark:text-slate-300 font-semibold">{att.target}:</span>
                            <span className="text-slate-500 truncate max-w-sm">{att.responsePreview || att.error}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {testError && (
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
                    {testError}
                  </div>
                )}
              </div>

              <div className="flex justify-end border-t border-slate-100 dark:border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* PORTAL MODAL 3: Model & API Key Settings Modal */}
      {showKeyModal &&
        createPortal(
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[99999] overflow-y-auto flex items-center justify-center p-4 sm:p-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-scaleUp my-auto">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-[#4285F4]">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Google AI Studio & Model Settings
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Configure your model selection & API key settings.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowKeyModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Google AI Studio API Key Box */}
              <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#4285F4] uppercase tracking-wider">
                    Google Gemini API Key
                  </label>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Loaded from .env</span>
                  </span>
                </div>

                <input
                  type="text"
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value.trim())}
                  placeholder="Enter your Gemini API key..."
                  className="w-full px-3.5 py-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-[#4285F4] focus:ring-2 focus:ring-blue-500/20 font-mono shadow-sm"
                />
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Connected to <strong>gemini-2.5-flash-image (Nano Banana)</strong>.
                </p>
              </div>

              {/* Model Selector */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Image Generation Model
                </label>
                <div className="space-y-2">
                  {(Object.keys(modelLabels) as ImageModelType[]).map((mKey) => {
                    const mInfo = modelLabels[mKey];
                    const isSelected = tempModel === mKey;
                    return (
                      <div
                        key={mKey}
                        onClick={() => setTempModel(mKey)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/40 border-[#4285F4] ring-1 ring-[#4285F4]'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{mInfo.name}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-950 text-[#4285F4] border border-blue-200 dark:border-blue-800">
                              {mInfo.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{mInfo.desc}</p>
                        </div>
                        <input
                          type="radio"
                          name="modelSelection"
                          checked={isSelected}
                          onChange={() => setTempModel(mKey)}
                          className="accent-[#4285F4]"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onApiKeyChange(tempKey);
                    onModelChange(tempModel);
                    setShowKeyModal(false);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#4285F4] hover:bg-blue-600 text-xs font-bold text-white shadow-lg shadow-blue-500/20"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </header>
  );
};
