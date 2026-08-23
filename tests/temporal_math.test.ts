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

  it('calculates exact cumulative timeline offsets for 10 slots', () => {
    const configs: { index: number; temporalConfig: SlotTemporalConfig }[] = [];
    for (let i = 10; i >= 1; i--) {
      configs.push({
        index: i,
        temporalConfig: {
          mode: i % 2 === 0 ? 'SPEED_UP' : 'TRUNCATE_FRONT',
          targetDurationSeconds: 3.0,
          trimStartSeconds: 0,
          trimEndSeconds: 3.0,
        },
      });
    }

    const { offsets, totalDuration } = calculateTimelineOffsets(configs);
    expect(offsets.length).toBe(10);
    expect(totalDuration).toBe(30.0);

    // Slot 10 starts at 0.0s and ends at 3.0s
    expect(offsets[0].slotIndex).toBe(10);
    expect(offsets[0].startTime).toBe(0.0);
    expect(offsets[0].endTime).toBe(3.0);

    // Slot 9 starts at 3.0s and ends at 6.0s
    expect(offsets[1].slotIndex).toBe(9);
    expect(offsets[1].startTime).toBe(3.0);
    expect(offsets[1].endTime).toBe(6.0);

    // Slot 1 starts at 27.0s and ends at 30.0s
    expect(offsets[9].slotIndex).toBe(1);
    expect(offsets[9].startTime).toBe(27.0);
    expect(offsets[9].endTime).toBe(30.0);
  });

  it('correctly maps master playhead time to active slot and local clip frame (DEF-02)', () => {
    const configsMap: Record<number, SlotTemporalConfig> = {};
    const configsList = [];
    for (let i = 10; i >= 1; i--) {
      const cfg: SlotTemporalConfig = {
        mode: 'TRUNCATE_FRONT',
        targetDurationSeconds: 3.0,
        trimStartSeconds: 1.0,
        trimEndSeconds: 4.0,
      };
      configsMap[i] = cfg;
      configsList.push({ index: i, temporalConfig: cfg });
    }

    const { offsets } = calculateTimelineOffsets(configsList);

    // At t = 1.5s -> inside Slot 10 (offset 0.0..3.0). Local time = 1.0 + 1.5 = 2.5s
    const mapping1 = mapPlayheadToSlotTime(1.5, offsets, configsMap);
    expect(mapping1.slotIndex).toBe(10);
    expect(mapping1.localClipTime).toBe(2.5);

    // At t = 4.0s -> inside Slot 9 (offset 3.0..6.0). Elapsed = 1.0s. Local time = 1.0 + 1.0 = 2.0s
    const mapping2 = mapPlayheadToSlotTime(4.0, offsets, configsMap);
    expect(mapping2.slotIndex).toBe(9);
    expect(mapping2.localClipTime).toBe(2.0);
  });
});
