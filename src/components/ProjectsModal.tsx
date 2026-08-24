import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  FolderOpen,
  Plus,
  Trash2,
  ExternalLink,
  Search,
  Clock,
  Sparkles,
  Film,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { JobSummary } from '../types';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentJobId: string | null;
  jobs: JobSummary[];
  isLoading: boolean;
  onSelectJob: (jobId: string) => void;
  onCreateNewJob: () => void;
  onDeleteJob: (jobId: string) => Promise<void>;
  onRefreshJobs: () => void;
}

export const ProjectsModal: React.FC<ProjectsModalProps> = ({
  isOpen,
  onClose,
  currentJobId,
  jobs,
  isLoading,
  onSelectJob,
  onCreateNewJob,
  onDeleteJob,
  onRefreshJobs,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (deletingJobId) {
          setDeletingJobId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, deletingJobId, onClose]);

  if (!isOpen) return null;

  const filteredJobs = jobs.filter((j) => {
    const query = searchQuery.toLowerCase();
    return (
      (j.customerName || '').toLowerCase().includes(query) ||
      (j.creativeTheme || '').toLowerCase().includes(query) ||
      (j.jobId || '').toLowerCase().includes(query)
    );
  });

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return '';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getStageBadge = (job: JobSummary) => {
    if (job.hasMasterVideo) {
      return (
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Master Ready (30s)</span>
        </span>
      );
    }
    if (job.readyVideosCount > 0) {
      return (
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center gap-1.5 shadow-sm">
          <Film className="w-3.5 h-3.5" />
          <span>Veo Videos ({job.readyVideosCount}/10)</span>
        </span>
      );
    }
    if (job.readyImagesCount > 0) {
      return (
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1.5 shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Images ({job.readyImagesCount}/10)</span>
        </span>
      );
    }
    if (job.currentStage >= 2) {
      return (
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 flex items-center gap-1.5 shadow-sm">
          <Layers className="w-3.5 h-3.5" />
          <span>Prompts Ready</span>
        </span>
      );
    }
    return (
      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
        Draft / Setup
      </span>
    );
  };

  const handleConfirmDelete = async (jobId: string) => {
    setIsDeleting(true);
    try {
      await onDeleteJob(jobId);
      setDeletingJobId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-scaleUp">
        {/* Header */}
        <div className="px-6 sm:px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#4285F4] border border-blue-200 dark:border-blue-800 shadow-sm">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Projects Management
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                  {jobs.length} Total
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Switch, open, or delete saved countdown projects stored in Google Cloud Storage.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                onCreateNewJob();
                onClose();
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Start New Project</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Refresh Toolbar */}
        <div className="p-4 sm:px-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer or brand name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <button
            type="button"
            onClick={onRefreshJobs}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            title="Refresh projects list from Cloud Storage"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Project Cards List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-4 max-h-[60vh]">
          {isLoading && jobs.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-[#4285F4] mx-auto" />
              <p className="text-sm font-medium text-slate-500">Loading projects from Cloud Storage...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-16 space-y-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <FolderOpen className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {searchQuery ? 'No matching projects found' : 'No projects found'}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {searchQuery
                    ? `No projects matching "${searchQuery}". Try a different customer search term.`
                    : 'Start your first 10-shot countdown project to save progress to Cloud Storage.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onCreateNewJob();
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Start New Project</span>
              </button>
            </div>
          ) : (
            filteredJobs.map((job) => {
              const isActive = job.jobId === currentJobId;
              const isConfirmingDelete = deletingJobId === job.jobId;

              return (
                <div
                  key={job.jobId}
                  className={`p-5 rounded-2xl border transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800/80 ring-2 ring-blue-500/20 shadow-md'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Project Customer Title & Details */}
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                          {job.customerName || 'Untitled Brand'}
                        </h3>
                        {isActive && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Active Project</span>
                          </span>
                        )}
                        {getStageBadge(job)}
                      </div>

                      {job.creativeTheme && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {job.creativeTheme}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Updated {formatRelativeTime(job.updatedAt)}</span>
                        </span>
                        <span>•</span>
                        <span>{job.readyImagesCount}/10 Images</span>
                        <span>•</span>
                        <span>{job.readyVideosCount}/10 Veo Videos</span>
                      </div>
                    </div>

                    {/* Right: Open & Delete Actions */}
                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 animate-fadeIn">
                          <span className="text-xs font-bold text-rose-600 dark:text-rose-400 px-2 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Delete project?</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleConfirmDelete(job.jobId)}
                            disabled={isDeleting}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-sm transition-all"
                          >
                            {isDeleting ? 'Deleting...' : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingJobId(null)}
                            disabled={isDeleting}
                            className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              onSelectJob(job.jobId);
                              onClose();
                            }}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                              isActive
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                : 'bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>{isActive ? 'Current' : 'Open Project'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingJobId(job.jobId)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800 transition-colors"
                            title="Delete project from Cloud Storage"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
