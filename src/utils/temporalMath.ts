import { SlotTemporalConfig, TemporalMode } from '../types';

export const MIN_CLIP_DURATION = 0.500;
export const MAX_CLIP_DURATION = 4.000;
export const RAW_VEO_DURATION = 4.000;
export const MASTER_AUDIO_DURATION = 30.000;

export const DRAMATIC_PAUSE_START = 9.200;
export const DRAMATIC_PAUSE_DURATION = 1.000;
export const DRAMATIC_PAUSE_END = 10.200;

export function getDefaultTemporalConfigForSlot(slotIndex: number): SlotTemporalConfig {
  if (slotIndex >= 7) {
    // Act 1 (Shots 10, 9, 8, 7): 9.20s total / 4 = 2.30s per shot
    return {
      targetDurationSeconds: 2.300,
      mode: 'TRUNCATE_FRONT',
      trimStartSeconds: 1.700,
      trimEndSeconds: 4.000,
    };
  }
  // Act 2 (Shots 6, 5, 4, 3, 2, 1): 19.80s total / 6 = 3.30s per shot
  return {
    targetDurationSeconds: 3.300,
    mode: 'TRUNCATE_FRONT',
    trimStartSeconds: 0.700,
    trimEndSeconds: 4.000,
  };
}

export function clampDuration(duration: number): number {
  if (isNaN(duration)) return 3.000;
  return Math.max(MIN_CLIP_DURATION, Math.min(MAX_CLIP_DURATION, Number(duration.toFixed(3))));
}

export function computeTemporalBounds(
  mode: TemporalMode,
  requestedDuration: number
): { duration: number; trimStart: number; trimEnd: number; ptsFactor: number } {
  const duration = clampDuration(requestedDuration);

  switch (mode) {
    case 'PASSTHROUGH':
      return {
        duration: RAW_VEO_DURATION,
        trimStart: 0.000,
        trimEnd: RAW_VEO_DURATION,
        ptsFactor: 1.000,
      };

    case 'SPEED_UP':
      return {
        duration,
        trimStart: 0.000,
        trimEnd: RAW_VEO_DURATION,
        ptsFactor: Number((duration / RAW_VEO_DURATION).toFixed(6)),
      };

    case 'TRUNCATE_FRONT': {
      // Keeps the climax/zoom at the end (t from 4.0 - duration to 4.0)
      const trimStart = Number((RAW_VEO_DURATION - duration).toFixed(3));
      return {
        duration,
        trimStart,
        trimEnd: RAW_VEO_DURATION,
        ptsFactor: 1.000,
      };
    }

    case 'TRUNCATE_BACK': {
      // Keeps opening context (t from 0.0 to duration)
      return {
        duration,
        trimStart: 0.000,
        trimEnd: duration,
        ptsFactor: 1.000,
      };
    }
  }
}

export interface TimelineSlotOffset {
  slotIndex: number;
  startTime: number;
  duration: number;
  endTime: number;
}

export function calculateTimelineOffsets(
  configs: { index: number; temporalConfig: SlotTemporalConfig }[],
  includeDramaticPause: boolean = true
): { offsets: TimelineSlotOffset[]; totalDuration: number; hasDramaticPause: boolean } {
  // Sort from slot 10 down to 1 (chronological playback order)
  const sorted = [...configs].sort((a, b) => b.index - a.index);
  let currentTime = 0.000;
  const offsets: TimelineSlotOffset[] = [];
  let pauseInserted = false;

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];

    // If crossing the boundary from Act 1 (Shots 10-7) into Act 2 (Shots 6-1)
    if (includeDramaticPause && !pauseInserted && item.index <= 6) {
      // Check if any slot >= 7 exists before this or if starting at/after slot 6
      const hasPriorAct1Slots = sorted.some((s) => s.index >= 7);
      if (hasPriorAct1Slots) {
        currentTime = Math.max(currentTime, DRAMATIC_PAUSE_START);
        currentTime += DRAMATIC_PAUSE_DURATION;
        currentTime = Number(currentTime.toFixed(3));
      } else {
        currentTime = DRAMATIC_PAUSE_END;
      }
      pauseInserted = true;
    }

    const { duration } = computeTemporalBounds(
      item.temporalConfig.mode,
      item.temporalConfig.targetDurationSeconds
    );
    const startTime = Number(currentTime.toFixed(3));
    const endTime = Number((currentTime + duration).toFixed(3));
    offsets.push({
      slotIndex: item.index,
      startTime,
      duration,
      endTime,
    });
    currentTime = endTime;
  }

  return {
    offsets,
    totalDuration: Number(currentTime.toFixed(3)),
    hasDramaticPause: pauseInserted,
  };
}

export function mapPlayheadToSlotTime(
  playheadTime: number,
  offsets: TimelineSlotOffset[],
  configsMap: Record<number, SlotTemporalConfig>
): { slotIndex: number; localClipTime: number; isDramaticPause: boolean } {
  if (offsets.length === 0) return { slotIndex: 10, localClipTime: 0.0, isDramaticPause: false };

  const clampedPlayhead = Math.max(0, playheadTime);

  for (let i = 0; i < offsets.length; i++) {
    const offset = offsets[i];

    // Check if playhead falls in the dramatic silence pause gap between Act 1 and Act 2
    if (i > 0) {
      const prevOffset = offsets[i - 1];
      if (clampedPlayhead >= prevOffset.endTime && clampedPlayhead < offset.startTime) {
        return {
          slotIndex: 0,
          localClipTime: 0.0,
          isDramaticPause: true,
        };
      }
    }

    if (clampedPlayhead >= offset.startTime && clampedPlayhead < offset.endTime) {
      const elapsedInSlot = clampedPlayhead - offset.startTime;
      const config = configsMap[offset.slotIndex];
      const bounds = computeTemporalBounds(config.mode, config.targetDurationSeconds);

      let localClipTime = 0.0;
      if (config.mode === 'SPEED_UP') {
        localClipTime = elapsedInSlot * (RAW_VEO_DURATION / bounds.duration);
      } else if (config.mode === 'TRUNCATE_FRONT') {
        localClipTime = bounds.trimStart + elapsedInSlot;
      } else {
        localClipTime = bounds.trimStart + elapsedInSlot;
      }

      return {
        slotIndex: offset.slotIndex,
        localClipTime: Math.min(RAW_VEO_DURATION, Math.max(0, Number(localClipTime.toFixed(3)))),
        isDramaticPause: false,
      };
    }
  }

  // If past the end, return the last frame of the final slot (slot 1)
  const lastOffset = offsets[offsets.length - 1];
  return {
    slotIndex: lastOffset.slotIndex,
    localClipTime: RAW_VEO_DURATION,
    isDramaticPause: false,
  };
}
