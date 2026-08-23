import React from 'react';
import { X, Download, Film, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';
import { getMediaUrl } from '../utils/media';

interface MasterExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  isExporting: boolean;
  masterVideoUri: string | null;
  totalDuration: number;
  error: string | null;
  onExport: () => void;
}

export const MasterExportModal: React.FC<MasterExportModalProps> = ({
  isOpen,
  onClose,
  isExporting,
  masterVideoUri,
  totalDuration,
  error,
  onExport,
}) => {
  if (!isOpen) return null;

  const exportUrl = getMediaUrl(masterVideoUri);

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Master 30-Second Video Assembly
              </h3>
              <p className="text-xs text-slate-400">
                Native system ffmpeg concatenation + 30s audio sync.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isExporting ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            <span className="text-sm font-bold text-white">
              Executing Native ffmpeg Concat Pipeline...
            </span>
            <p className="text-xs text-slate-400 max-w-sm">
              Applying per-slot temporal transforms (Speed-Up / Truncate) and stitching with the 30-second soundtrack.
            </p>
          </div>
        ) : masterVideoUri ? (
          <div className="space-y-4">
            <div className="aspect-video w-full rounded-xl bg-black border border-slate-800 overflow-hidden shadow-2xl">
              <video
                src={exportUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Master Video Assembled ({totalDuration.toFixed(2)}s)</span>
              </div>

              <a
                href={exportUrl}
                download="countdown_30s_master.mp4"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Master MP4</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <p className="text-xs text-slate-300">
              All 10 video clips will be rendered with their configured temporal transforms and joined seamlessly with <code>public/countdown/countdown_track.mp3</code>.
            </p>
            <button
              type="button"
              onClick={onExport}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-bold shadow-xl shadow-cyan-500/20"
            >
              Start Master ffmpeg Assembly
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
