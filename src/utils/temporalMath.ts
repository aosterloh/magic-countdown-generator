import { SlotTemporalConfig, TemporalMode } from '../types';

export const MIN_CLIP_DURATION = 0.500;
export const MAX_CLIP_DURATION = 4.000;
export const RAW_VEO_DURATION = 4.000;
export const MASTER_AUDIO_DURATION = 30.000;

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
  configs: { index: number; temporalConfig: SlotTemporalConfig }[]
): { offsets: TimelineSlotOffset[]; totalDuration: number } {
  // Sort from slot 10 down to 1 (chronological playback order)
  const sorted = [...configs].sort((a, b) => b.index - a.index);
  let currentTime = 0.000;
  const offsets: TimelineSlotOffset[] = [];

  for (const item of sorted) {
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
  };
}

export function mapPlayheadToSlotTime(
  playheadTime: number,
  offsets: TimelineSlotOffset[],
  configsMap: Record<number, SlotTemporalConfig>
): { slotIndex: number; localClipTime: number } {
  if (offsets.length === 0) return { slotIndex: 10, localClipTime: 0.0 };

  const clampedPlayhead = Math.max(0, playheadTime);

  for (const offset of offsets) {
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
      };
    }
  }

  // If past the end, return the last frame of the final slot (slot 1)
  const lastOffset = offsets[offsets.length - 1];
  return {
    slotIndex: lastOffset.slotIndex,
    localClipTime: RAW_VEO_DURATION,
  };
}
