import { describe, it, expect } from 'vitest';
import {
  clampDuration,
  computeTemporalBounds,
  calculateTimelineOffsets,
  mapPlayheadToSlotTime,
} from '../src/utils/temporalMath';
import { SlotTemporalConfig } from '../src/types';

describe('Temporal Math & Timeline Clamping', () => {
  it('strictly clamps requested durations between 0.5s and 4.0s (DEF-03)', () => {
    expect(clampDuration(-1.0)).toBe(0.5);
    expect(clampDuration(0.2)).toBe(0.5);
    expect(clampDuration(2.5)).toBe(2.5);
    expect(clampDuration(4.0)).toBe(4.0);
    expect(clampDuration(6.5)).toBe(4.0);
    expect(clampDuration(NaN)).toBe(3.0);
  });

  it('computes SPEED_UP PTS scaling factor correctly', () => {
    const res = computeTemporalBounds('SPEED_UP', 3.0);
    expect(res.duration).toBe(3.0);
    expect(res.ptsFactor).toBe(0.75);
    expect(res.trimStart).toBe(0.0);
    expect(res.trimEnd).toBe(4.0);
  });

  it('computes TRUNCATE_FRONT window preserving zoom end', () => {
    const res = computeTemporalBounds('TRUNCATE_FRONT', 2.5);
    expect(res.duration).toBe(2.5);
    expect(res.trimStart).toBe(1.5);
    expect(res.trimEnd).toBe(4.0);
    expect(res.ptsFactor).toBe(1.0);
  });

  it('computes TRUNCATE_BACK window preserving opening context', () => {
    const res = computeTemporalBounds('TRUNCATE_BACK', 2.5);
    expect(res.duration).toBe(2.5);
    expect(res.trimStart).toBe(0.0);
    expect(res.trimEnd).toBe(2.5);
    expect(res.ptsFactor).toBe(1.0);
  });

  it('computes PASSTHROUGH 4s untouched configuration', () => {
    const res = computeTemporalBounds('PASSTHROUGH', 4.0);
    expect(res.duration).toBe(4.0);
    expect(res.trimStart).toBe(0.0);
    expect(res.trimEnd).toBe(4.0);
  });

  it('calculates exact cumulative timeline offsets for 10 slots with 1.0s dramatic pause', () => {
    const configs: { index: number; temporalConfig: SlotTemporalConfig }[] = [];
    for (let i = 10; i >= 1; i--) {
      configs.push({
        index: i,
        temporalConfig: {
          mode: 'TRUNCATE_FRONT',
          targetDurationSeconds: i >= 7 ? 2.300 : 3.300,
          trimStartSeconds: i >= 7 ? 1.700 : 0.700,
          trimEndSeconds: 4.000,
        },
      });
    }

    const { offsets, totalDuration, hasDramaticPause } = calculateTimelineOffsets(configs);
    expect(offsets.length).toBe(10);
    expect(hasDramaticPause).toBe(true);
    expect(totalDuration).toBe(30.0);

    // Slot 10 starts at 0.0s and ends at 2.3s
    expect(offsets[0].slotIndex).toBe(10);
    expect(offsets[0].startTime).toBe(0.0);
    expect(offsets[0].endTime).toBe(2.3);

    // Slot 7 starts at 6.9s and ends at 9.2s
    expect(offsets[3].slotIndex).toBe(7);
    expect(offsets[3].startTime).toBe(6.9);
    expect(offsets[3].endTime).toBe(9.2);

    // Slot 6 starts at 10.2s (after 1.0s pause) and ends at 13.5s
    expect(offsets[4].slotIndex).toBe(6);
    expect(offsets[4].startTime).toBe(10.2);
    expect(offsets[4].endTime).toBe(13.5);

    // Slot 1 starts at 26.7s and ends at 30.0s
    expect(offsets[9].slotIndex).toBe(1);
    expect(offsets[9].startTime).toBe(26.7);
    expect(offsets[9].endTime).toBe(30.0);
  });

  it('correctly maps master playhead time to active slot across the dramatic pause', () => {
    const configsMap: Record<number, SlotTemporalConfig> = {};
    const configsList = [];
    for (let i = 10; i >= 1; i--) {
      const cfg: SlotTemporalConfig = {
        mode: 'TRUNCATE_FRONT',
        targetDurationSeconds: i >= 7 ? 2.300 : 3.300,
        trimStartSeconds: i >= 7 ? 1.700 : 0.700,
        trimEndSeconds: 4.000,
      };
      configsMap[i] = cfg;
      configsList.push({ index: i, temporalConfig: cfg });
    }

    const { offsets } = calculateTimelineOffsets(configsList);

    // At t = 1.0s -> inside Slot 10 (offset 0.0..2.3). Local time = 1.70 + 1.0 = 2.70s
    const mapping1 = mapPlayheadToSlotTime(1.0, offsets, configsMap);
    expect(mapping1.slotIndex).toBe(10);
    expect(mapping1.localClipTime).toBe(2.7);
    expect(mapping1.isDramaticPause).toBe(false);

    // At t = 9.5s -> inside 1.0s Dramatic Pause (9.2s..10.2s). MUST return isDramaticPause: true and NOT Slot 1!
    const mappingPause = mapPlayheadToSlotTime(9.5, offsets, configsMap);
    expect(mappingPause.isDramaticPause).toBe(true);
    expect(mappingPause.slotIndex).toBe(0);

    // At t = 10.5s -> inside Slot 6 (offset 10.2..13.5). Elapsed = 0.3s. Local time = 0.70 + 0.3 = 1.00s
    const mapping2 = mapPlayheadToSlotTime(10.5, offsets, configsMap);
    expect(mapping2.slotIndex).toBe(6);
    expect(mapping2.localClipTime).toBe(1.0);
    expect(mapping2.isDramaticPause).toBe(false);
  });
});
