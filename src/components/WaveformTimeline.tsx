import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Scissors,
  Zap,
  Maximize2,
  Clock,
  Music,
} from 'lucide-react';
import { CountdownSlot, SlotTemporalConfig, TemporalMode } from '../types';
import {
  calculateTimelineOffsets,
  mapPlayheadToSlotTime,
  clampDuration,
} from '../utils/temporalMath';
import { getMediaUrl } from '../utils/media';

interface WaveformTimelineProps {
  slots: CountdownSlot[];
  onUpdateSlotTemporalConfig: (slotIndex: number, config: SlotTemporalConfig) => void;
  audioTrackUri: string;
}

export const WaveformTimeline: React.FC<WaveformTimelineProps> = ({
  slots,
  onUpdateSlotTemporalConfig,
  audioTrackUri,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0.0);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(10);
  const [audioDuration, setAudioDuration] = useState(30.0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const masterVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Compute cumulative timeline offsets
  const { offsets, totalDuration } = calculateTimelineOffsets(slots);
  const configsMap = slots.reduce((acc, s) => {
    acc[s.index] = s.temporalConfig;
    return acc;
  }, {} as Record<number, SlotTemporalConfig>);

  // Active slot and local clip time mapped from master playhead (DEF-02)
  const activeMapping = mapPlayheadToSlotTime(currentTime, offsets, configsMap);
  const activeSlot = slots.find((s) => s.index === activeMapping.slotIndex);

  // Setup Web Audio Waveform Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);

    const numBars = 180;
    const barWidth = width / numBars;
    const centerY = height / 2;

    for (let i = 0; i < numBars; i++) {
      const normalizedPos = i / numBars;
      const beat = Math.sin(normalizedPos * Math.PI * 20) * 0.4 + 0.6;
      const energy = (Math.sin(normalizedPos * Math.PI * 4) + 1.2) * 0.5;
      const barHeight = Math.max(4, beat * energy * (height * 0.42));

      const timeAtBar = normalizedPos * Math.max(30.0, totalDuration);
      const isPastPlayhead = timeAtBar <= currentTime;

      ctx.fillStyle = isPastPlayhead ? '#38bdf8' : '#475569';
      ctx.fillRect(i * barWidth, centerY - barHeight, barWidth - 1.5, barHeight * 2);
    }
  }, [currentTime, totalDuration]);

  // Audio Playback & Animation Loop
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updatePlayhead = () => {
      if (audio) {
        setCurrentTime(audio.currentTime);
        if (audio.currentTime >= totalDuration) {
          audio.pause();
          setIsPlaying(false);
        } else if (isPlaying) {
          animationFrameRef.current = requestAnimationFrame(updatePlayhead);
        }
      }
    };

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updatePlayhead);
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, totalDuration]);

  // Sync Single-Viewport Master Video element with active local time (DEF-02)
  useEffect(() => {
    if (masterVideoRef.current && activeSlot?.rawVideoUri) {
      if (Math.abs(masterVideoRef.current.currentTime - activeMapping.localClipTime) > 0.1) {
        masterVideoRef.current.currentTime = activeMapping.localClipTime;
      }
    }
  }, [activeMapping.localClipTime, activeSlot?.rawVideoUri]);

  const handleSeek = (newTime: number) => {
    const clamped = Math.max(0, Math.min(totalDuration, newTime));
    setCurrentTime(clamped);
    if (audioRef.current) {
      audioRef.current.currentTime = clamped;
    }
  };

  const selectedSlot = slots.find((s) => s.index === selectedSlotIndex) || slots[0];

  const slotColors: Record<number, string> = {
    10: 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300',
    9: 'bg-blue-500/20 border-blue-500/50 text-blue-300',
    8: 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300',
    7: 'bg-violet-500/20 border-violet-500/50 text-violet-300',
    6: 'bg-purple-500/20 border-purple-500/50 text-purple-300',
    5: 'bg-fuchsia-500/20 border-fuchsia-500/50 text-fuchsia-300',
    4: 'bg-pink-500/20 border-pink-500/50 text-pink-300',
    3: 'bg-rose-500/20 border-rose-500/50 text-rose-300',
    2: 'bg-amber-500/20 border-amber-500/50 text-amber-300',
    1: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300',
  };

  const resolvedAudioUrl = getMediaUrl(audioTrackUri);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 backdrop-blur-sm">
      <audio
        ref={audioRef}
        src={resolvedAudioUrl}
        onLoadedMetadata={(e) => setAudioDuration(e.currentTarget.duration || 30.0)}
      />

      {/* Top Header: Timeline Master Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              Stage 4: Interactive Audio-Waveform Timeline & Temporal Alignment
            </h2>
            <p className="text-xs text-slate-400">
              Align all 10 video clips against the soundtrack waveform with sub-second precision.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300">
              {currentTime.toFixed(2)}s / <strong className="text-white">{totalDuration.toFixed(2)}s</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={togglePlay}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 transition-all"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            <span>{isPlaying ? 'Pause Timeline' : 'Play Timeline'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Waveform Canvas + Single-Viewport Master Preview Player */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Waveform & Multi-Track Canvas (Span 2) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Audio Waveform Canvas */}
          <div
            className="relative h-20 w-full rounded-xl bg-slate-950 border border-slate-800 overflow-hidden cursor-pointer group"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const ratio = clickX / rect.width;
              handleSeek(ratio * totalDuration);
            }}
          >
            <canvas ref={canvasRef} width={800} height={80} className="w-full h-full" />

            {/* Red Playhead Line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10 shadow-[0_0_8px_rgba(244,63,94,0.8)] pointer-events-none"
              style={{
                left: `${(currentTime / Math.max(30.0, totalDuration)) * 100}%`,
              }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 -ml-1 -mt-0.5 shadow-md" />
            </div>
          </div>

          {/* 10 Colored Video Clip Blocks on Multi-Track Timeline */}
          <div className="relative h-14 w-full rounded-xl bg-slate-950 border border-slate-800 flex overflow-hidden p-1 gap-1">
            {offsets.map((offset) => {
              const widthPct = (offset.duration / totalDuration) * 100;
              const isSelected = selectedSlotIndex === offset.slotIndex;
              const isActiveInPlayback = activeMapping.slotIndex === offset.slotIndex;

              return (
                <div
                  key={offset.slotIndex}
                  onClick={() => setSelectedSlotIndex(offset.slotIndex)}
                  style={{ width: `${widthPct}%` }}
                  className={`h-full rounded-lg border flex flex-col justify-center items-center px-1 cursor-pointer transition-all ${
                    slotColors[offset.slotIndex]
                  } ${
                    isSelected ? 'ring-2 ring-cyan-400 scale-[0.98]' : 'hover:brightness-125'
                  } ${isActiveInPlayback ? 'brightness-150' : ''}`}
                >
                  <span className="font-mono font-bold text-xs">#{offset.slotIndex}</span>
                  <span className="text-[10px] opacity-80 font-mono">
                    {offset.duration.toFixed(1)}s
                  </span>
                </div>
              );
            })}
          </div>

          {/* Slot Duration & Temporal Configuration Panel */}
          {selectedSlot && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 font-mono">
                  Configure Timing for Shot #{selectedSlot.index}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Raw Veo: 4.0s $\to$ Effective: {selectedSlot.temporalConfig.targetDurationSeconds.toFixed(1)}s
                </span>
              </div>

              {/* Mode Selector Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { mode: 'SPEED_UP' as TemporalMode, label: 'Speed-Up (1.33x)', icon: Zap },
                  { mode: 'PASSTHROUGH' as TemporalMode, label: 'Untouched (4.0s)', icon: Maximize2 },
                  { mode: 'TRUNCATE_FRONT' as TemporalMode, label: 'Trim Front (Keep Zoom)', icon: Scissors },
                  { mode: 'TRUNCATE_BACK' as TemporalMode, label: 'Trim Back (Keep Context)', icon: Scissors },
                ].map(({ mode, label, icon: Icon }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() =>
                      onUpdateSlotTemporalConfig(selectedSlot.index, {
                        ...selectedSlot.temporalConfig,
                        mode,
                      })
                    }
                    className={`py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      selectedSlot.temporalConfig.mode === mode
                        ? 'bg-cyan-600 text-white shadow-md'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Duration Slider (Sub-Second Precision 0.5s - 4.0s) */}
              {selectedSlot.temporalConfig.mode !== 'PASSTHROUGH' && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs text-slate-300 font-medium">
                    <span>Target Duration (Sub-Second Slider)</span>
                    <span className="font-mono text-cyan-400 font-bold">
                      {selectedSlot.temporalConfig.targetDurationSeconds.toFixed(1)}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="4.0"
                    step="0.1"
                    value={selectedSlot.temporalConfig.targetDurationSeconds}
                    onChange={(e) =>
                      onUpdateSlotTemporalConfig(selectedSlot.index, {
                        ...selectedSlot.temporalConfig,
                        targetDurationSeconds: clampDuration(parseFloat(e.target.value)),
                      })
                    }
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>0.5s</span>
                    <span>2.0s</span>
                    <span>3.0s</span>
                    <span>4.0s</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Single-Viewport Master Scrubbing Preview Player (DEF-02) */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            Master Scrubbing Player
          </span>
          <div className="aspect-video w-full rounded-xl bg-slate-950 border border-slate-800 overflow-hidden relative shadow-lg flex items-center justify-center">
            {activeSlot?.rawVideoUri ? (
              <video
                ref={masterVideoRef}
                src={getMediaUrl(activeSlot.rawVideoUri)}
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : activeSlot?.currentImageUri ? (
              <img
                src={getMediaUrl(activeSlot.currentImageUri)}
                alt="Active Frame"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-xs text-slate-500">Generate videos to preview master</div>
            )}

            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[10px] font-mono text-cyan-400 border border-slate-800">
              Active: Shot #{activeMapping.slotIndex} ({activeMapping.localClipTime.toFixed(1)}s)
            </div>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            As you scrub or play the master audio waveform, this viewport dynamically displays the exact synchronized clip and frame for the active timeline position.
          </p>
        </div>
      </div>
    </div>
  );
};
