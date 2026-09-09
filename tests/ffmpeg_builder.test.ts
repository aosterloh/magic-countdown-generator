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

  it('generates master concat arguments with all 10 clips, in-stream trims, and 1.0s dramatic pause', () => {
    const clips = Array.from({ length: 10 }, (_, i) => ({
      index: 10 - i,
      path: `slot_${10 - i}.mp4`,
      temporalConfig: {
        mode: 'TRUNCATE_FRONT' as const,
        targetDurationSeconds: 10 - i >= 7 ? 2.300 : 3.300,
        trimStartSeconds: 10 - i >= 7 ? 1.700 : 0.700,
        trimEndSeconds: 4.000,
      },
    }));
    const args = generateMasterConcatFFmpegArgs(
      clips,
      'public/countdown/countdown_track.mp3',
      30.0,
      'master_output.mp4'
    );

    expect(args).toContain('-filter_complex');
    const fcIndex = args.indexOf('-filter_complex');
    const filterString = args[fcIndex + 1];

    // Expect 1.0s pause between Act 1 and Act 2
    expect(filterString).toContain('color=c=black:s=1280x720:d=1.000:r=60[vpause]');
    expect(filterString).toContain('trim=start=1.700:duration=2.300');
    expect(filterString).toContain('trim=start=0.700:duration=3.300');
    expect(filterString).toContain('concat=n=11:v=1:a=0[vconcat]');
    expect(filterString).toContain('apad=whole_dur=30.000,atrim=0:30.000[aout]');
    expect(args).toContain('master_output.mp4');
  });

  it('generates partial master concat arguments with dark video padding for remaining duration and continuous 30s audio', () => {
    // Only 2 clips ready (Slot 10 and Slot 9 @ 2.3s each = 4.6s total)
    const clips = [
      {
        index: 10,
        path: 'slot_10.mp4',
        temporalConfig: { mode: 'TRUNCATE_FRONT' as const, targetDurationSeconds: 2.300, trimStartSeconds: 1.7, trimEndSeconds: 4.0 },
      },
      {
        index: 9,
        path: 'slot_9.mp4',
        temporalConfig: { mode: 'TRUNCATE_FRONT' as const, targetDurationSeconds: 2.300, trimStartSeconds: 1.7, trimEndSeconds: 4.0 },
      },
    ];
    const args = generateMasterConcatFFmpegArgs(
      clips,
      'public/countdown/countdown_track.mp3',
      4.6,
      'partial_master_output.mp4',
      'FAST_720P',
      30.0
    );

    const fcIndex = args.indexOf('-filter_complex');
    const filterString = args[fcIndex + 1];

    // Expect black color generation for remaining 25.4s (30.0 - 4.6 = 25.4s)
    expect(filterString).toContain('color=c=black:s=1280x720:d=25.400:r=60[vblack]');
    expect(filterString).toContain('[v0][v1][vblack]concat=n=3:v=1:a=0[vconcat]');
    expect(filterString).toContain('apad=whole_dur=30.000,atrim=0:30.000[aout]');
  });

  it('generates FULL_4K master concat with Lanczos + Unsharp filter and 45M YouTube bitrate flags', () => {
    const clips = [
      {
        index: 10,
        path: 'slot_10.mp4',
        temporalConfig: { mode: 'TRUNCATE_FRONT' as const, targetDurationSeconds: 2.300, trimStartSeconds: 1.7, trimEndSeconds: 4.0 },
      },
    ];
    const args = generateMasterConcatFFmpegArgs(
      clips,
      'public/countdown/countdown_track.mp3',
      2.3,
      '4k_master.mp4',
      'FULL_4K',
      30.0
    );

    const fcIndex = args.indexOf('-filter_complex');
    const filterString = args[fcIndex + 1];

    expect(filterString).toContain('scale=3840:2160:force_original_aspect_ratio=decrease:flags=lanczos+accurate_rnd');
    expect(filterString).toContain('unsharp=5:5:0.8:5:5:0.4');
    expect(args).toContain('-b:v');
    expect(args).toContain('45M');
    expect(args).toContain('-movflags');
    expect(args).toContain('+faststart');
  });
});
