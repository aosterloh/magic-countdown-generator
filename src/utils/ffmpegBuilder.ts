import { SlotTemporalConfig, VideoQualityMode } from '../types';
import { computeTemporalBounds, getDefaultTemporalConfigForSlot } from './temporalMath';

export interface SingleSlotFFmpegArgs {
  slotIndex: number;
  inputPath: string;
  outputPath: string;
  commandArgs: string[];
}

export function generateSingleSlotFFmpegArgs(
  slotIndex: number,
  inputPath: string,
  outputPath: string,
  config: SlotTemporalConfig,
  qualityMode: VideoQualityMode = 'FAST_720P'
): string[] {
  const bounds = computeTemporalBounds(config.mode, config.targetDurationSeconds);
  const resolution = qualityMode === 'FULL_4K' ? '3840:2160' : '1280:720';
  const preset = qualityMode === 'FULL_4K' ? 'medium' : 'ultrafast';
  const crf = qualityMode === 'FULL_4K' ? '15' : '24';

  const args: string[] = ['-y', '-i', inputPath];

  if (config.mode === 'SPEED_UP') {
    args.push(
      '-vf',
      `setpts=${bounds.ptsFactor}*PTS,scale=${resolution}:force_original_aspect_ratio=decrease,pad=${resolution}:(ow-iw)/2:(oh-ih)/2,fps=60,format=yuv420p`,
      '-t',
      bounds.duration.toFixed(3)
    );
  } else if (config.mode === 'TRUNCATE_FRONT') {
    args.push(
      '-ss',
      bounds.trimStart.toFixed(3),
      '-t',
      bounds.duration.toFixed(3),
      '-vf',
      `scale=${resolution}:force_original_aspect_ratio=decrease,pad=${resolution}:(ow-iw)/2:(oh-ih)/2,fps=60,format=yuv420p`
    );
  } else if (config.mode === 'TRUNCATE_BACK') {
    args.push(
      '-ss',
      '0.000',
      '-t',
      bounds.duration.toFixed(3),
      '-vf',
      `scale=${resolution}:force_original_aspect_ratio=decrease,pad=${resolution}:(ow-iw)/2:(oh-ih)/2,fps=60,format=yuv420p`
    );
  } else {
    // PASSTHROUGH
    args.push(
      '-vf',
      `scale=${resolution}:force_original_aspect_ratio=decrease,pad=${resolution}:(ow-iw)/2:(oh-ih)/2,fps=60,format=yuv420p`,
      '-t',
      '4.000'
    );
  }

  args.push('-c:v', 'libx264', '-preset', preset, '-crf', crf, '-an', outputPath);
  return args;
}

export interface MasterConcatSlotInput {
  index: number;
  path: string;
  temporalConfig?: SlotTemporalConfig;
}

export function generateMasterConcatFFmpegArgs(
  slotsOrPaths: (MasterConcatSlotInput | string)[],
  audioTrackPath: string,
  totalVideoDuration: number,
  outputMasterPath: string,
  qualityMode: VideoQualityMode = 'FAST_720P',
  fullTargetDuration: number = 30.0
): string[] {
  const args: string[] = ['-y'];

  // Normalize inputs to MasterConcatSlotInput
  const slots: MasterConcatSlotInput[] = slotsOrPaths.map((item, i) => {
    if (typeof item === 'string') {
      const idx = 10 - i;
      return {
        index: idx,
        path: item,
        temporalConfig: getDefaultTemporalConfigForSlot(idx),
      };
    }
    const idx = item.index || (10 - i);
    return {
      index: idx,
      path: item.path,
      temporalConfig: item.temporalConfig || getDefaultTemporalConfigForSlot(idx),
    };
  });

  // Add all input video files
  for (const s of slots) {
    args.push('-i', s.path);
  }
  // Add audio track as the last input
  args.push('-i', audioTrackPath);

  const numClips = slots.length;
  const is4K = qualityMode === 'FULL_4K';

  // Base normalization filter: Normalize each input clip to uniform 720p 60fps first.
  // 4K Lanczos + Unsharp is applied AFTER concatenation to the single combined stream,
  // preventing 10 simultaneous 4K frame buffers from exhausting container RAM.
  const baseScaleAndPad = `scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2`;

  const filterComplexParts: string[] = [];
  const concatInputTags: string[] = [];

  let accumulatedDuration = 0.0;
  let pauseInserted = false;

  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    const mode = s.temporalConfig?.mode || 'TRUNCATE_FRONT';
    const reqDur = s.temporalConfig?.targetDurationSeconds || (s.index >= 7 ? 2.300 : 3.300);
    const bounds = computeTemporalBounds(mode, reqDur);

    // Insert 1.0s dramatic pause between Act 1 (10-7) and Act 2 (6-1)
    if (!pauseInserted && s.index <= 6 && slots.some((x) => x.index >= 7)) {
      filterComplexParts.push(
        `color=c=black:s=1280x720:d=1.000:r=60[vpause]`
      );
      concatInputTags.push('[vpause]');
      accumulatedDuration += 1.000;
      pauseInserted = true;
    }

    if (mode === 'SPEED_UP') {
      filterComplexParts.push(
        `[${i}:v]setpts=${bounds.ptsFactor}*PTS,${baseScaleAndPad},fps=60,format=yuv420p,trim=duration=${bounds.duration.toFixed(3)},setpts=PTS-STARTPTS[v${i}]`
      );
    } else if (mode === 'TRUNCATE_FRONT') {
      filterComplexParts.push(
        `[${i}:v]trim=start=${bounds.trimStart.toFixed(3)}:duration=${bounds.duration.toFixed(3)},setpts=PTS-STARTPTS,${baseScaleAndPad},fps=60,format=yuv420p[v${i}]`
      );
    } else if (mode === 'TRUNCATE_BACK') {
      filterComplexParts.push(
        `[${i}:v]trim=start=0.000:duration=${bounds.duration.toFixed(3)},setpts=PTS-STARTPTS,${baseScaleAndPad},fps=60,format=yuv420p[v${i}]`
      );
    } else {
      // PASSTHROUGH
      filterComplexParts.push(
        `[${i}:v]trim=start=0.000:duration=4.000,setpts=PTS-STARTPTS,${baseScaleAndPad},fps=60,format=yuv420p[v${i}]`
      );
    }

    concatInputTags.push(`[v${i}]`);
    accumulatedDuration += bounds.duration;
  }

  // Check if trailing duration is needed up to 30.0s
  const remainingDuration = Math.max(0, Number((fullTargetDuration - accumulatedDuration).toFixed(3)));
  if (remainingDuration > 0.05 && concatInputTags.length > 0) {
    filterComplexParts.push(
      `color=c=black:s=1280x720:d=${remainingDuration.toFixed(3)}:r=60[vblack]`
    );
    concatInputTags.push('[vblack]');
  } else if (concatInputTags.length === 0) {
    if (is4K) {
      filterComplexParts.push(
        `color=c=black:s=1280x720:d=${fullTargetDuration.toFixed(3)}:r=60[vbase]`,
        `[vbase]scale=3840:2160:force_original_aspect_ratio=decrease:flags=lanczos+accurate_rnd,pad=3840:2160:(ow-iw)/2:(oh-ih)/2,unsharp=5:5:0.8:5:5:0.4[vconcat]`
      );
    } else {
      filterComplexParts.push(
        `color=c=black:s=1280x720:d=${fullTargetDuration.toFixed(3)}:r=60[vconcat]`
      );
    }
  }

  if (concatInputTags.length > 0) {
    if (is4K) {
      filterComplexParts.push(
        `${concatInputTags.join('')}concat=n=${concatInputTags.length}:v=1:a=0[vbase]`,
        `[vbase]scale=3840:2160:force_original_aspect_ratio=decrease:flags=lanczos+accurate_rnd,pad=3840:2160:(ow-iw)/2:(oh-ih)/2,unsharp=5:5:0.8:5:5:0.4[vconcat]`
      );
    } else {
      filterComplexParts.push(
        `${concatInputTags.join('')}concat=n=${concatInputTags.length}:v=1:a=0[vconcat]`
      );
    }
  }

  // Audio track handling: Pad / trim audio track to exactly 30.00s
  const audioInputIndex = numClips;
  filterComplexParts.push(
    `[${audioInputIndex}:a]apad=whole_dur=${fullTargetDuration.toFixed(3)},atrim=0:${fullTargetDuration.toFixed(3)}[aout]`
  );

  const preset = is4K ? 'fast' : 'ultrafast';
  const crf = is4K ? '15' : '23';
  const audioBitrate = is4K ? '320k' : '192k';

  args.push(
    '-filter_complex',
    filterComplexParts.join(';'),
    '-map',
    '[vconcat]',
    '-map',
    '[aout]',
    '-c:v',
    'libx264',
    '-preset',
    preset,
    '-crf',
    crf,
    '-pix_fmt',
    'yuv420p'
  );

  if (is4K) {
    args.push('-b:v', '45M', '-maxrate', '60M', '-bufsize', '90M');
  }

  args.push(
    '-movflags',
    '+faststart',
    '-c:a',
    'aac',
    '-b:a',
    audioBitrate,
    '-shortest',
    outputMasterPath
  );

  return args;
}
