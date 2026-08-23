import React, { useState, useRef, useEffect } from 'react';
import {
  FolderKanban,
  ChevronDown,
  Plus,
  Search,
  Check,
  Film,
  Sparkles,
  Layers,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { JobSummary } from '../types';

interface JobSelectorDropdownProps {
  currentJobId: string | null;
  jobs: JobSummary[];
  isLoading: boolean;
  saveStatus: 'saved' | 'saving' | 'error';
  onSelectJob: (jobId: string) => void;
  onCreateNewJob: () => void;
}

export const JobSelectorDropdown: React.FC<JobSelectorDropdownProps> = ({
  currentJobId,
  jobs,
  isLoading,
  saveStatus,
  onSelectJob,
  onCreateNewJob,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentJob = jobs.find((j) => j.jobId === currentJobId);

  const filteredJobs = jobs.filter(
    (j) =>
      j.jobId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.creativeTheme.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return 'recently';
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  };

  const getStageBadge = (job: JobSummary) => {
    if (job.hasMasterVideo) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
          🌟 Master Ready
        </span>
      );
    }
    if (job.readyVideosCount > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
          <Film className="w-2.5 h-2.5" /> Veo ({job.readyVideosCount}/10)
        </span>
      );
    }
    if (job.readyImagesCount > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <Sparkles className="w-2.5 h-2.5" /> Images ({job.readyImagesCount}/10)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
        <Layers className="w-2.5 h-2.5" /> Stage {job.currentStage}
      </span>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main Switcher Button */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 transition-all text-xs font-semibold shadow-inner group"
        >
          <FolderKanban className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          <div className="flex flex-col text-left">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
              Active Project
            </span>
            <span className="text-white font-mono text-xs font-bold truncate max-w-[160px] sm:max-w-[220px]">
              {currentJobId || (isLoading ? 'Loading...' : 'Select Project')}
            </span>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-amber-400' : ''
            }`}
          />
        </button>

        {/* Sync / Auto-Save Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] font-mono">
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              Saving...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              Save error
            </span>
          )}
        </div>

        {/* New Project Quick Button */}
        <button
          type="button"
          onClick={onCreateNewJob}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold shadow-lg shadow-blue-500/20 transition-all hover:scale-105"
          title="Create New Countdown Job"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Project</span>
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl z-50 overflow-hidden animate-fadeIn">
          {/* Header & Search */}
          <div className="p-3 border-b border-slate-800 space-y-2 bg-slate-950/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <FolderKanban className="w-3.5 h-3.5 text-amber-400" />
                Persistent GCS Projects ({jobs.length})
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onCreateNewJob();
                }}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> New
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search jobs, customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-700/60 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                autoFocus
              />
            </div>
          </div>

          {/* Job List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
            {filteredJobs.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No matching projects found
              </div>
            ) : (
              filteredJobs.map((job) => {
                const isActive = job.jobId === currentJobId;
                return (
                  <button
                    key={job.jobId}
                    type="button"
                    onClick={() => {
                      onSelectJob(job.jobId);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left p-3 hover:bg-slate-800/80 transition-colors flex items-start gap-3 group ${
                      isActive ? 'bg-amber-500/10' : ''
                    }`}
                  >
                    <div className="mt-0.5">
                      {isActive ? (
                        <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs">
                          <Check className="w-3 h-3" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 group-hover:text-white flex items-center justify-center text-xs">
                          <FolderKanban className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span
                          className={`font-mono text-xs font-bold truncate ${
                            isActive ? 'text-amber-400' : 'text-white group-hover:text-amber-300'
                          }`}
                        >
                          {job.jobId}
                        </span>
                        {getStageBadge(job)}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="truncate max-w-[150px]">{job.customerName}</span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                          <Clock className="w-2.5 h-2.5" />
                          {formatRelativeTime(job.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-950/70 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onCreateNewJob();
              }}
              className="w-full py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Start New Countdown Project
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
