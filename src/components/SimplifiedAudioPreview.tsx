import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Music,
  Film,
  Sparkles,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { CountdownSlot } from '../types';
import { getMediaUrl } from '../utils/media';

interface SimplifiedAudioPreviewProps {
  slots: CountdownSlot[];
  audioTrackUri: string;
  onProceedToMaster?: () => void;
  onSelectSlot?: (diegeticNumber: number) => void;
}

interface TimelineSegment {
  diegeticNumber: number;
  startTime: number;
  duration: number;
  endTime: number;
  trimStart: number; // For 4s raw clip, where playback begins
  color: string;
}

export const SimplifiedAudioPreview: React.FC<SimplifiedAudioPreviewProps> = ({
  slots,
  audioTrackUri,
  onProceedToMaster,
  onSelectSlot,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0.0);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Define the exact 30.00s golden beat grid:
  // Act 1 (10, 9, 8, 7): 4 * 2.30s = 9.20s
  // Black drop pause: 1.00s = 9.20s -> 10.20s
  // Act 2 (6, 5, 4, 3, 2, 1): 6 * 3.30s = 19.80s
  // Total = 30.00s
  const timelineSegments: TimelineSegment[] = useMemo(() => {
    const colors: Record<number, string> = {
      10: 'bg-cyan-500',
      9: 'bg-blue-500',
      8: 'bg-indigo-500',
      7: 'bg-violet-500',
      6: 'bg-purple-500',
      5: 'bg-fuchsia-500',
      4: 'bg-pink-500',
      3: 'bg-rose-500',
      2: 'bg-amber-500',
      1: 'bg-emerald-500',
    };

    const segments: TimelineSegment[] = [];
    let t = 0;

    // Act 1: 10, 9, 8, 7 (2.3s each, trim first 1.7s of 4s Veo clip)
    for (const num of [10, 9, 8, 7]) {
      const dur = 2.3;
      segments.push({
        diegeticNumber: num,
        startTime: t,
        duration: dur,
        endTime: t + dur,
        trimStart: 4.0 - dur, // 1.7s
        color: colors[num],
      });
      t += dur;
    }

    // Dramatic Pause: 9.2s -> 10.2s (1.0s)
    t += 1.0;

    // Act 2: 6, 5, 4, 3, 2, 1 (3.3s each, trim first 0.7s of 4s Veo clip)
    for (const num of [6, 5, 4, 3, 2, 1]) {
      const dur = 3.3;
      segments.push({
        diegeticNumber: num,
        startTime: t,
        duration: dur,
        endTime: t + dur,
        trimStart: 4.0 - dur, // 0.7s
        color: colors[num],
      });
      t += dur;
    }

    return segments;
  }, []);

  // Determine current timeline state
  const isDramaticPause = currentTime >= 9.2 && currentTime < 10.2;

  const currentSegment = useMemo(() => {
    if (isDramaticPause) return null;
    return (
      timelineSegments.find(
        (seg) => currentTime >= seg.startTime && currentTime < seg.endTime
      ) || (currentTime >= 30.0 ? timelineSegments[timelineSegments.length - 1] : timelineSegments[0])
    );
  }, [currentTime, isDramaticPause, timelineSegments]);

  const activeSlot = useMemo(() => {
    if (!currentSegment) return null;
    return slots.find((s) => s.diegeticNumber === currentSegment.diegeticNumber) || null;
  }, [slots, currentSegment]);

  const activeVideoSrc = activeSlot?.processedVideoUri || activeSlot?.rawVideoUri || null;

  // Sync active video playback time with audio clock
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentSegment || isDramaticPause) return;

    const clipElapsed = currentTime - currentSegment.startTime;
    const targetVideoTime = Math.min(4.0, Math.max(0, currentSegment.trimStart + clipElapsed));

    if (Math.abs(video.currentTime - targetVideoTime) > 0.25) {
      video.currentTime = targetVideoTime;
    }

    if (isPlaying && video.paused) {
      video.play().catch(() => {});
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }
  }, [currentTime, currentSegment, isDramaticPause, isPlaying, activeVideoSrc]);

  // Animation frame loop tracking audio playback
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const tick = () => {
      if (!audio) return;
      setCurrentTime(audio.currentTime);

      if (audio.currentTime >= 30.0) {
        audio.pause();
        audio.currentTime = 0;
        setCurrentTime(0);
        setIsPlaying(false);
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = timelineSegments[0].trimStart;
        }
      } else if (isPlaying) {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };

    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(tick);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, timelineSegments]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if (videoRef.current) videoRef.current.pause();
    } else {
      if (currentTime >= 29.8) {
        audio.currentTime = 0;
        setCurrentTime(0);
      }
      audio.play().then(() => {
        setIsPlaying(true);
        if (videoRef.current) videoRef.current.play().catch(() => {});
      }).catch((e) => {
        console.warn('Audio playback prevented:', e);
      });
    }
  };

  const handleSeek = (newTime: number) => {
    const clamped = Math.max(0, Math.min(30.0, newTime));
    setCurrentTime(clamped);
    if (audioRef.current) {
      audioRef.current.currentTime = clamped;
    }

    // Also update video position immediately
    const seg = timelineSegments.find(
      (s) => clamped >= s.startTime && clamped < s.endTime
    );
    if (seg && videoRef.current) {
      const clipElapsed = clamped - seg.startTime;
      videoRef.current.currentTime = Math.min(4.0, seg.trimStart + clipElapsed);
    }
  };

  const handleRestart = () => {
    handleSeek(0);
    if (!isPlaying) {
      togglePlay();
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const resolvedAudioUrl = getMediaUrl(audioTrackUri);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 transition-colors animate-fadeIn">
      {/* Hidden Audio Player */}
      <audio
        ref={audioRef}
        src={resolvedAudioUrl}
        preload="auto"
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-[#4285F4] border border-blue-500/20 flex items-center gap-1">
              <Music className="w-3 h-3" />
              <span>Step 4 • Auto-Timed Preview</span>
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              30-Second Countdown Preview with Music
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Clips are automatically trimmed to match the 30-second soundtrack and beat drop before #6.
          </p>
        </div>

        {/* Time & Play Controls in Header */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs flex items-center gap-2 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-[#4285F4]" />
            <span className="text-slate-700 dark:text-slate-300 font-bold">
              {currentTime.toFixed(1)}s
            </span>
            <span className="text-slate-400">/ 30.0s</span>
          </div>

          <button
            type="button"
            onClick={togglePlay}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#4285F4] hover:bg-blue-600 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/25 transition-all active:scale-95 cursor-pointer"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-white" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white ml-0.5" />
                <span>Play Full 30s Countdown</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Preview Viewport */}
      <div className="relative aspect-video w-full max-w-4xl mx-auto rounded-2xl bg-black border border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center group">
        {isDramaticPause ? (
          // Solid Black Screen during Dramatic Beat Pause (9.2s -> 10.2s)
          <div className="w-full h-full bg-black flex flex-col items-center justify-center text-center p-4 animate-fadeIn">
            <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping mb-3" />
            <span className="font-mono text-xs font-extrabold tracking-widest text-slate-400 uppercase">
              1.0s Beat Drop • Silence
            </span>
            <span className="text-[11px] text-slate-600 font-mono mt-1">
              Music resumes with Scene #6
            </span>
          </div>
        ) : activeVideoSrc ? (
          <video
            ref={videoRef}
            key={currentSegment?.diegeticNumber}
            src={getMediaUrl(activeVideoSrc)}
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        ) : activeSlot?.currentImageUri ? (
          <img
            src={getMediaUrl(activeSlot.currentImageUri)}
            alt={`Scene #${currentSegment?.diegeticNumber}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-xs text-slate-500 font-mono">
            Waiting for scene #{currentSegment?.diegeticNumber || 10}...
          </div>
        )}

        {/* Overlay Badges */}
        {!isDramaticPause && currentSegment && (
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 text-xs font-mono font-bold text-white shadow-lg flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${currentSegment.color}`} />
              <span>Scene #{currentSegment.diegeticNumber}</span>
              <span className="text-slate-400 font-normal">({currentSegment.duration.toFixed(1)}s)</span>
            </span>
          </div>
        )}

        {/* Quick Click-to-Play Center Overlay when paused */}
        {!isPlaying && (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-[#4285F4]/90 hover:bg-[#4285F4] text-white flex items-center justify-center shadow-2xl shadow-blue-500/50 transition-all hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-sm"
            title="Play Preview"
          >
            <Play className="w-7 h-7 fill-white ml-1" />
          </button>
        )}

        {/* Bottom Floating Bar with Playback Controls */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shadow-lg">
          <button
            type="button"
            onClick={handleRestart}
            className="p-1.5 text-slate-300 hover:text-white transition-colors"
            title="Restart Countdown"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={toggleMute}
            className="p-1.5 text-slate-300 hover:text-white transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 30-Second Segmented Timeline Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Timeline Structure (Click any number to jump)
          </span>
          <span className="font-mono text-[11px]">
            Act 1 (10-7) • <strong className="text-slate-700 dark:text-slate-200">1.0s Drop</strong> • Act 2 (6-1)
          </span>
        </div>

        {/* Interactive Scrub Bar */}
        <div
          className="relative h-12 w-full rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex overflow-hidden p-1 gap-1 cursor-pointer select-none"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const ratio = Math.max(0, Math.min(1, clickX / rect.width));
            handleSeek(ratio * 30.0);
          }}
        >
          {/* Animated Red Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-20 shadow-[0_0_8px_rgba(244,63,94,0.9)] pointer-events-none transition-all duration-75"
            style={{ left: `${(currentTime / 30.0) * 100}%` }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 -ml-1 -mt-0.5 shadow-md" />
          </div>

          {/* Act 1: 10, 9, 8, 7 */}
          {timelineSegments.slice(0, 4).map((seg) => {
            const widthPct = (seg.duration / 30.0) * 100;
            const isActive = currentSegment?.diegeticNumber === seg.diegeticNumber;

            return (
              <div
                key={seg.diegeticNumber}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSeek(seg.startTime);
                  if (onSelectSlot) onSelectSlot(seg.diegeticNumber);
                }}
                style={{ width: `${widthPct}%` }}
                className={`h-full rounded-xl flex flex-col justify-center items-center px-1 transition-all text-white font-mono cursor-pointer ${
                  seg.color
                } ${
                  isActive
                    ? 'ring-2 ring-white shadow-lg brightness-110 scale-[0.98]'
                    : 'opacity-75 hover:opacity-100 hover:brightness-105'
                }`}
                title={`Scene #${seg.diegeticNumber} (${seg.duration.toFixed(1)}s)`}
              >
                <span className="text-xs font-black">#{seg.diegeticNumber}</span>
                <span className="text-[9px] opacity-90">{seg.duration.toFixed(1)}s</span>
              </div>
            );
          })}

          {/* 1.0s Dramatic Pause Drop Slot (Between 7 and 6) */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleSeek(9.2);
            }}
            style={{ width: `${(1.0 / 30.0) * 100}%` }}
            className={`h-full rounded-xl border border-dashed border-slate-400 dark:border-slate-700 bg-slate-900 flex flex-col justify-center items-center px-1 text-center cursor-pointer transition-all ${
              isDramaticPause ? 'ring-2 ring-rose-500 brightness-150' : 'opacity-80 hover:opacity-100'
            }`}
            title="1.0s Dramatic Drop Pause (Black Screen Silence)"
          >
            <span className="text-[9px] font-mono font-black text-rose-400">DROP</span>
            <span className="text-[8px] font-mono text-slate-400">1.0s</span>
          </div>

          {/* Act 2: 6, 5, 4, 3, 2, 1 */}
          {timelineSegments.slice(4).map((seg) => {
            const widthPct = (seg.duration / 30.0) * 100;
            const isActive = currentSegment?.diegeticNumber === seg.diegeticNumber;

            return (
              <div
                key={seg.diegeticNumber}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSeek(seg.startTime);
                  if (onSelectSlot) onSelectSlot(seg.diegeticNumber);
                }}
                style={{ width: `${widthPct}%` }}
                className={`h-full rounded-xl flex flex-col justify-center items-center px-1 transition-all text-white font-mono cursor-pointer ${
                  seg.color
                } ${
                  isActive
                    ? 'ring-2 ring-white shadow-lg brightness-110 scale-[0.98]'
                    : 'opacity-75 hover:opacity-100 hover:brightness-105'
                }`}
                title={`Scene #${seg.diegeticNumber} (${seg.duration.toFixed(1)}s)`}
              >
                <span className="text-xs font-black">#{seg.diegeticNumber}</span>
                <span className="text-[9px] opacity-90">{seg.duration.toFixed(1)}s</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
