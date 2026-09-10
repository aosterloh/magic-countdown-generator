import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Film,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Zap,
  BrainCircuit,
  Play,
  Layers,
  ArrowLeft,
} from 'lucide-react';
import { getMediaUrl } from '../utils/media';
import { UpscaleEngineType } from '../types';

interface MasterExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  isExporting: boolean;
  isExportingExtended?: boolean;
  masterVideoUri: string | null;
  extendedMasterVideoUri?: string | null;
  totalDuration: number;
  error: string | null;
  onExport: (engine: UpscaleEngineType) => void;
  onExportExtended?: () => void;
  initialTab?: '30s' | 'extended';
}

export const MasterExportModal: React.FC<MasterExportModalProps> = ({
  isOpen,
  onClose,
  isExporting,
  isExportingExtended = false,
  masterVideoUri,
  extendedMasterVideoUri,
  totalDuration,
  error,
  onExport,
  onExportExtended,
  initialTab = '30s',
}) => {
  const [selectedEngine, setSelectedEngine] = useState<UpscaleEngineType>('LANCZOS_4K');
  const [activeTab, setActiveTab] = useState<'30s' | 'extended'>(initialTab);
  const [isRegenerateMode, setIsRegenerateMode] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  if (!isOpen) return null;

  const currentVideoUri = activeTab === '30s' ? masterVideoUri : extendedMasterVideoUri;
  const exportUrl = currentVideoUri ? getMediaUrl(currentVideoUri) : '';

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-scaleUp max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Master Video Assembly & 4K Mastering
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  16:9 YouTube & Slides Ready
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Native FFmpeg 4K UHD synchronization with Google I/O outro crossfade.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isExporting ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            <span className="text-sm font-bold text-white">
              {selectedEngine === 'REAL_ESRGAN_4K'
                ? 'Running Real-ESRGAN Deep AI Super-Resolution...'
                : selectedEngine === 'LANCZOS_4K'
                ? 'Executing High-Bitrate 4K Lanczos Mastering Pipeline...'
                : 'Executing Native FFmpeg Concat Pipeline...'}
            </span>
            <p className="text-xs text-slate-400 max-w-md">
              {selectedEngine === 'REAL_ESRGAN_4K'
                ? 'Extracting frames and reconstructing micro-textures via deep convolutional neural network into 3840x2160 UHD @ 60fps.'
                : 'Applying per-slot temporal transforms, multi-pass 4K Lanczos spatial filtering with adaptive unsharp detail, and muxing the 30.0s master soundtrack.'}
            </p>
          </div>
        ) : isExportingExtended ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
            <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
            <span className="text-sm font-bold text-white">
              Stitching Extended Master with Google I/O Outro...
            </span>
            <p className="text-xs text-slate-400 max-w-md">
              Applying smooth 2.0-second crossfade transition between 30s countdown and Google I/O 4K video.
            </p>
          </div>
        ) : masterVideoUri && !isRegenerateMode ? (
          <div className="space-y-4">
            {/* Version Switcher Tabs */}
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('30s')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === '30s'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>30s Countdown Only</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('extended')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'extended'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Extended (+ Google I/O Outro)</span>
                {extendedMasterVideoUri ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                ) : (
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-500/30 text-purple-200">
                    Ready to build
                  </span>
                )}
              </button>
            </div>

            {/* Video Player or Extended Generation Prompt */}
            {activeTab === '30s' || extendedMasterVideoUri ? (
              <div className="aspect-video w-full rounded-2xl bg-black border border-slate-800 overflow-hidden shadow-2xl">
                <video
                  key={exportUrl}
                  src={exportUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="aspect-video w-full rounded-2xl bg-slate-950 border border-dashed border-purple-500/30 flex flex-col items-center justify-center p-6 text-center gap-4">
                <div className="p-4 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Layers className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h4 className="text-sm font-bold text-white">Create Extended Master Video</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Appends the 4K Google I/O outro video with a cinematic 2-second crossfade transition.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onExportExtended}
                  className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 flex items-center gap-2 transition-all active:scale-95"
                >
                  <Play className="w-4 h-4" />
                  <span>Build Extended Master (~2m 01s)</span>
                </button>
              </div>
            )}

            {/* Control Bar: Download & Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {activeTab === '30s'
                    ? `Countdown Master Ready (${totalDuration.toFixed(2)}s • 4K UHD 60fps)`
                    : extendedMasterVideoUri
                    ? `Extended Master Ready (~121s • 4K UHD 60fps)`
                    : '30s Master Ready'}
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {activeTab === '30s' && exportUrl && (
                  <a
                    href={`${exportUrl}${exportUrl.includes('?') ? '&' : '?'}download=1`}
                    download="countdown_30s_master_4k.mp4"
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download 30s Master</span>
                  </a>
                )}

                {activeTab === 'extended' && extendedMasterVideoUri && (
                  <a
                    href={`${getMediaUrl(extendedMasterVideoUri)}${getMediaUrl(extendedMasterVideoUri).includes('?') ? '&' : '?'}download=1`}
                    download="countdown_extended_master_google_io_4k.mp4"
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Extended Master</span>
                  </a>
                )}

                {activeTab === 'extended' && !extendedMasterVideoUri && (
                  <button
                    type="button"
                    onClick={onExportExtended}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 transition-all active:scale-95"
                  >
                    <Play className="w-4 h-4" />
                    <span>Build Extended Master</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsRegenerateMode(true)}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                  title="Regenerate Master Video (pick upscale engine)"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {isRegenerateMode && masterVideoUri && (
              <div className="flex items-center justify-between pb-2">
                <button
                  type="button"
                  onClick={() => setIsRegenerateMode(false)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Current Master</span>
                </button>
                <span className="text-[11px] font-semibold text-amber-400">
                  Regenerating will replace the current master
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                Choose 4K Master Upscaling Engine
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option 1: Lanczos 4K (Instant) */}
                <button
                  type="button"
                  onClick={() => setSelectedEngine('LANCZOS_4K')}
                  className={`p-4 rounded-2xl border text-left transition-all relative ${
                    selectedEngine === 'LANCZOS_4K'
                      ? 'bg-cyan-950/40 border-cyan-500 ring-2 ring-cyan-500/20'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Option 1: Instant 4K Lanczos</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300">
                      ~5-8 sec
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Multi-pass Lanczos spatial interpolation + adaptive unsharp detail filter. High-bitrate 45 Mbps 4K for YouTube & Google Slides.
                  </p>
                </button>

                {/* Option 2: Real-ESRGAN AI Super-Resolution */}
                <button
                  type="button"
                  onClick={() => setSelectedEngine('REAL_ESRGAN_4K')}
                  className={`p-4 rounded-2xl border text-left transition-all relative ${
                    selectedEngine === 'REAL_ESRGAN_4K'
                      ? 'bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/20'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
                      <span>Option 2: Real-ESRGAN AI</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300">
                      Deep AI
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Deep neural super-resolution model that reconstructs fine micro-textures, metal grain, and crisp numeral edges.
                  </p>
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400 leading-relaxed">
                All 10 video clips will be rendered with their configured temporal transforms, stitched seamlessly with the 30-second soundtrack, and encoded with <code className="text-cyan-400">-movflags +faststart</code> for instant YouTube and Google Slides playback.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRegenerateMode(false);
                  onExport(selectedEngine);
                }}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white text-sm font-bold shadow-xl shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Play className="w-4 h-4" />
                <span>
                  {isRegenerateMode ? 'Re-render 4K Master Video' : 'Start 4K Master Video Assembly'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
