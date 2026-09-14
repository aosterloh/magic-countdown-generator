import React, { useRef, useState, useEffect } from 'react';
import {
  Film,
  Play,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock,
  User,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { MasterVideoEntry } from '../types';
import { getMediaUrl } from '../utils/media';

interface RecentMastersCarouselProps {
  onPlayVideo: (videoUri: string) => void;
  onOpenProject?: (jobId: string) => void;
  currentJobId?: string | null;
  refreshTrigger?: number;
}

const API_BASE = window.location.port === '5173' ? 'http://localhost:3001' : '';

export const RecentMastersCarousel: React.FC<RecentMastersCarouselProps> = ({
  onPlayVideo,
  onOpenProject,
  currentJobId,
  refreshTrigger = 0,
}) => {
  const [masters, setMasters] = useState<MasterVideoEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredJobId, setHoveredJobId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const fetchRecentMasters = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/recent-masters`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.masters)) {
          setMasters(data.masters);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch recent master countdowns:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentMasters();
  }, [refreshTrigger]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const distance = 340;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  };

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

  if (!isLoading && masters.length === 0) {
    return null; // Gracefully hide when no master videos exist yet
  }

  return (
    <section className="w-full pt-6 pb-2 border-t border-slate-200 dark:border-slate-800/80 space-y-4 animate-fadeIn">
      {/* Header with Title and Scroll Controls */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 text-[#4285F4]">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                Recent Final Cuts
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-[#4285F4] border border-blue-500/20">
                Team Gallery
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              The last 10 completed final cuts & full videos produced across all projects. Click any thumbnail to watch.
            </p>
          </div>
        </div>

        {/* Scroll Arrows */}
        {masters.length > 3 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scroll('left')}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors shadow-sm cursor-pointer"
              title="Scroll Left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors shadow-sm cursor-pointer"
              title="Scroll Right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Horizontal Scroll Track */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-3 pt-1 scroll-smooth snap-x snap-mandatory scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800"
        style={{ scrollbarWidth: 'thin' }}
      >
        {isLoading
          ? Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="w-72 sm:w-80 shrink-0 aspect-video rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse"
              />
            ))
          : masters.map((item) => {
              const videoUri = item.masterVideoUri || item.extendedMasterVideoUri || '';
              const isCurrent = currentJobId === item.jobId;
              const isHovered = hoveredJobId === item.jobId;

              return (
                <div
                  key={item.jobId}
                  onMouseEnter={() => setHoveredJobId(item.jobId)}
                  onMouseLeave={() => setHoveredJobId(null)}
                  onClick={() => videoUri && onPlayVideo(videoUri)}
                  className={`group relative w-72 sm:w-80 shrink-0 snap-start bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-200 shadow-md hover:shadow-xl hover:-translate-y-0.5 overflow-hidden cursor-pointer ${
                    isCurrent
                      ? 'border-[#4285F4] ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Thumbnail / Video Preview Viewport */}
                  <div className="relative aspect-video w-full bg-slate-950 overflow-hidden flex items-center justify-center">
                    {item.thumbnailUri ? (
                      <img
                        src={getMediaUrl(item.thumbnailUri)}
                        alt={item.customerName}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center">
                        <Film className="w-8 h-8 text-blue-400/50" />
                      </div>
                    )}

                    {/* Dark Vignette Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center transition-all duration-200">
                      <div className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-lg group-hover:bg-[#4285F4] group-hover:scale-110 transition-all">
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      </div>
                    </div>

                    {/* Top Badges */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                      <span className="px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-md text-[10px] font-mono font-bold text-blue-300 border border-white/10 flex items-center gap-1 shadow">
                        <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                        <span>{item.extendedMasterVideoUri ? '~2m Full Video' : '30s Final Cut'}</span>
                      </span>

                      {item.creatorLdap && (
                        <span className="px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-md text-[10px] font-mono text-slate-300 border border-white/10 flex items-center gap-1 shadow">
                          <User className="w-2.5 h-2.5 text-slate-400" />
                          <span>@{item.creatorLdap}</span>
                        </span>
                      )}
                    </div>

                    {/* Bottom Metadata inside image */}
                    <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-white pointer-events-none">
                      <span className="text-xs font-black truncate drop-shadow-md pr-2">
                        {item.customerName}
                      </span>
                      {item.updatedAt && (
                        <span className="text-[10px] font-mono text-slate-300 shrink-0 drop-shadow flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{formatRelativeTime(item.updatedAt)}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom Tray */}
                  <div className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex-1" title={item.creativeTheme}>
                      {item.creativeTheme || 'Countdown Final Cut'}
                    </p>

                    {onOpenProject && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenProject(item.jobId);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-[#4285F4] text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                        title="Open this project in studio"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Open</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
      </div>
    </section>
  );
};
