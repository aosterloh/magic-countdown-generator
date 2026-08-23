import { describe, it, expect } from 'vitest';
import {
  generateSingleSlotFFmpegArgs,
  generateMasterConcatFFmpegArgs,
} from '../src/utils/ffmpegBuilder';
import { SlotTemporalConfig } from '../src/types';

describe('FFmpeg Command Builder (DEF-01 & DEF-04)', () => {
  it('generates SPEED_UP filter command with setpts factor and Fast 720p resolution', () => {
    const config: SlotTemporalConfig = {
      mode: 'SPEED_UP',
      targetDurationSeconds: 3.0,
      trimStartSeconds: 0,
      trimEndSeconds: 4.0,
    };
    const args = generateSingleSlotFFmpegArgs(10, 'input.mp4', 'output.mp4', config, 'FAST_720P');

    expect(args).toContain('-vf');
    const vfIndex = args.indexOf('-vf');
    expect(args[vfIndex + 1]).toContain('setpts=0.75*PTS');
    expect(args[vfIndex + 1]).toContain('scale=1280:720');
    expect(args).toContain('-t');
    const tIndex = args.indexOf('-t');
    expect(args[tIndex + 1]).toBe('3.000');
    expect(args).toContain('-preset');
    expect(args).toContain('ultrafast');
  });

  it('generates FULL_4K filter with 3840x2160 UHD resolution and high-fidelity CRF', () => {
    const config: SlotTemporalConfig = {
      mode: 'SPEED_UP',
      targetDurationSeconds: 3.0,
      trimStartSeconds: 0,
      trimEndSeconds: 4.0,
    };
    const args = generateSingleSlotFFmpegArgs(10, 'input.mp4', 'output.mp4', config, 'FULL_4K');

    expect(args).toContain('-vf');
    const vfIndex = args.indexOf('-vf');
    expect(args[vfIndex + 1]).toContain('scale=3840:2160');
    expect(args).toContain('-crf');
    const crfIndex = args.indexOf('-crf');
    expect(args[crfIndex + 1]).toBe('15');
  });

  it('generates TRUNCATE_FRONT filter with start offset and exact duration', () => {
    const config: SlotTemporalConfig = {
      mode: 'TRUNCATE_FRONT',
      targetDurationSeconds: 2.5,
      trimStartSeconds: 1.5,
      trimEndSeconds: 4.0,
    };
    const args = generateSingleSlotFFmpegArgs(9, 'input.mp4', 'output.mp4', config, 'FAST_720P');

    expect(args).toContain('-ss');
    const ssIndex = args.indexOf('-ss');
    expect(args[ssIndex + 1]).toBe('1.500');
    expect(args).toContain('-t');
    const tIndex = args.indexOf('-t');
    expect(args[tIndex + 1]).toBe('2.500');
  });

  it('generates master concat arguments with audio padding when duration >= 30s (DEF-04)', () => {
    const clips = Array.from({ length: 10 }, (_, i) => `slot_${10 - i}.mp4`);
    const args = generateMasterConcatFFmpegArgs(
      clips,
      'public/countdown/countdown_track.mp3',
      32.5,
      'master_output.mp4'
    );

    expect(args).toContain('-filter_complex');
    const fcIndex = args.indexOf('-filter_complex');
    const filterString = args[fcIndex + 1];

    expect(filterString).toContain('concat=n=10:v=1:a=0[vconcat]');
    expect(filterString).toContain('apad=whole_dur=32.500[aout]');
    expect(args).toContain('master_output.mp4');
  });

  it('generates master concat arguments with audio trimming and fade when duration < 30s (DEF-04)', () => {
    const clips = Array.from({ length: 10 }, (_, i) => `slot_${10 - i}.mp4`);
    const args = generateMasterConcatFFmpegArgs(
      clips,
      'public/countdown/countdown_track.mp3',
      28.0,
      'master_output.mp4'
    );

    const fcIndex = args.indexOf('-filter_complex');
    const filterString = args[fcIndex + 1];

    expect(filterString).toContain('atrim=0:28.000');
    expect(filterString).toContain('afade=t=out:st=27.500:d=0.5[aout]');
  });
});
